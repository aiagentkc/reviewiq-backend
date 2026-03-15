// routes/index.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const claude = require('../services/claudeService');
const sms = require('../services/smsService');
const email = require('../services/emailService');
const { generateReviewForm } = require('../config/reviewForm');

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ReviewIQ Backend', timestamp: new Date().toISOString(), integrations: { claude: !!process.env.ANTHROPIC_API_KEY, twilio: !!process.env.TWILIO_ACCOUNT_SID, email: !!process.env.EMAIL_FROM } });
});

router.get('/clients', (req, res) => res.json({ clients: db.getClients() }));
router.get('/clients/:id', (req, res) => { const c = db.getClient(req.params.id); if (!c) return res.status(404).json({ error: 'Client not found' }); res.json({ client: c }); });
router.post('/clients', (req, res) => { if (!req.body.business_name) return res.status(400).json({ error: 'business_name required' }); const client = db.createClient(req.body); db.logActivity(client.id, 'client_created', client.business_name); res.status(201).json({ client }); });
router.put('/clients/:id', (req, res) => { const client = db.updateClient(req.params.id, req.body); if (!client) return res.status(404).json({ error: 'Not found' }); res.json({ client }); });
router.get('/clients/:id/stats', (req, res) => res.json(db.getStats(req.params.id)));
router.put('/clients/:id/branding', (req, res) => { const client = db.updateClient(req.params.id, { logo_url: req.body.logo_url, brand_color: req.body.brand_color }); if (!client) return res.status(404).json({ error: 'Not found' }); res.json({ client, message: 'Branding updated' }); });

router.get('/clients/:clientId/reviews', (req, res) => res.json({ reviews: db.getReviews(req.params.clientId, req.query.status) }));
router.post('/clients/:clientId/reviews', (req, res) => { const review = db.createReview(Object.assign({}, req.body, { client_id: req.params.clientId })); res.status(201).json({ review }); });

router.post('/reviews/:id/generate-response', async (req, res) => {
  const review = db.getReview(req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  const client = db.getClient(review.client_id);
  try {
    const aiResponse = await claude.generateReviewResponse({ review, businessName: client.business_name, tone: client.tone });
    db.updateReview(req.params.id, { ai_response: aiResponse, status: 'draft' });
    res.json({ aiResponse, message: 'AI response generated' });
  } catch (e) { res.status(500).json({ error: 'Failed', details: e.message }); }
});

router.post('/reviews/:id/publish', (req, res) => {
  const review = db.getReview(req.params.id);
  if (!review) return res.status(404).json({ error: 'Not found' });
  const finalResponse = req.body.responseText || review.ai_response;
  if (!finalResponse) return res.status(400).json({ error: 'No response text' });
  db.updateReview(req.params.id, { published_response: finalResponse, status: 'published', responded_at: new Date().toISOString() });
  res.json({ message: 'Response published' });
});

router.get('/clients/:clientId/customers', (req, res) => res.json({ customers: db.getCustomers(req.params.clientId) }));
router.post('/clients/:clientId/customers', (req, res) => { if (!req.body.name) return res.status(400).json({ error: 'name required' }); const customer = db.createCustomer(Object.assign({}, req.body, { client_id: req.params.clientId })); res.status(201).json({ customer }); });

router.post('/customers/:id/preview-message', async (req, res) => {
  const customer = db.getCustomer(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Not found' });
  const client = db.getClient(customer.client_id);
  try { const generated = await claude.generateReviewRequestMessage({ customer, businessName: client.business_name, channel: req.body.channel || 'sms', reviewLink: client.review_link }); res.json(generated); }
  catch (e) { res.status(500).json({ error: 'Failed', details: e.message }); }
});

router.post('/customers/:id/send-request', async (req, res) => {
  const customer = db.getCustomer(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Not found' });
  const client = db.getClient(customer.client_id);
  const channel = req.body.channel || 'sms';
  try {
    const generated = await claude.generateReviewRequestMessage({ customer, businessName: client.business_name, channel, reviewLink: client.review_link });
    let result;
    if (channel === 'sms' && customer.phone) { result = await sms.sendSMS({ to: customer.phone, body: generated.body }); }
    else if (channel === 'email' && customer.email) { result = await email.sendEmail({ to: customer.email, subject: generated.subject, body: generated.body, fromName: client.business_name }); }
    else { return res.status(400).json({ error: 'No contact info for ' + channel }); }
    if (result.success) { db.updateCustomer(req.params.id, { request_status: 'sent', request_sent_at: new Date().toISOString() }); res.json({ success: true, messageBody: generated.body }); }
    else { res.status(500).json({ error: 'Send failed', details: result.error }); }
  } catch (e) { res.status(500).json({ error: 'Failed', details: e.message }); }
});

router.get('/clients/:clientId/screening', (req, res) => res.json({ queue: db.getScreening(req.params.clientId) }));

router.post('/clients/:clientId/screening/submit', (req, res) => {
  const { author, rating, text, service } = req.body;
  if (!author || !text) return res.status(400).json({ error: 'author and text required' });
  if (rating < 5) { db.logActivity(req.params.clientId, 'private_feedback', rating + ' star from ' + author); return res.json({ message: 'Thank you for your feedback!', routed: 'private' }); }
  const item = db.createScreening({ client_id: req.params.clientId, author, rating, text, service });
  res.json({ message: 'Thank you! Your review has been submitted.', routed: 'screening', id: item.id });
});

router.post('/screening/:id/approve', (req, res) => {
  const item = db.updateScreening(req.params.id, { approved: true, approved_at: new Date().toISOString() });
  if (!item) return res.status(404).json({ error: 'Not found' });
  db.logActivity(item.client_id, 'screening_approved', item.author);
  res.json({ success: true, message: 'Review approved' });
});

router.post('/screening/:id/reject', (req, res) => {
  const item = db.updateScreening(req.params.id, { approved: false, approved_at: new Date().toISOString() });
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true, message: 'Review declined' });
});

router.get('/form/:clientId', (req, res) => {
  const client = db.getClient(req.params.clientId);
  const bizName = client ? client.business_name : 'us';
  const logoUrl = client ? (client.logo_url || '') : '';
  const brandColor = client ? (client.brand_color || '#6366f1') : '#6366f1';
  res.send(generateReviewForm(req.params.clientId, bizName, logoUrl, brandColor));
});

module.exports = router;
