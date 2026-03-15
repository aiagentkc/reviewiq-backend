// routes/index.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const claude = require('../services/claudeService');
const sms = require('../services/smsService');
const email = require('../services/emailService');

// ── HEALTH ────────────────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.json({
    status: 'ok', service: 'ReviewIQ Backend', timestamp: new Date().toISOString(),
    integrations: {
      claude: !!process.env.ANTHROPIC_API_KEY,
      twilio: !!process.env.TWILIO_ACCOUNT_SID,
      email: !!process.env.EMAIL_FROM,
    },
  });
});

// ── CLIENTS ───────────────────────────────────────────────────────────────────
router.get('/clients', (req, res) => res.json({ clients: db.getClients() }));
router.get('/clients/:id', (req, res) => {
  const c = db.getClient(req.params.id);
  if (!c) return res.status(404).json({ error: 'Client not found' });
  res.json({ client: c });
});
router.post('/clients', (req, res) => {
  if (!req.body.business_name) return res.status(400).json({ error: 'business_name is required' });
  const client = db.createClient(req.body);
  db.logActivity(client.id, 'client_created', client.business_name);
  res.status(201).json({ client });
});
router.put('/clients/:id', (req, res) => {
  const client = db.updateClient(req.params.id, req.body);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  res.json({ client, message: 'Updated' });
});
router.get('/clients/:id/stats', (req, res) => res.json(db.getStats(req.params.id)));

// ── REVIEWS ───────────────────────────────────────────────────────────────────
router.get('/clients/:clientId/reviews', (req, res) => {
  res.json({ reviews: db.getReviews(req.params.clientId, req.query.status) });
});

router.post('/clients/:clientId/reviews', (req, res) => {
  const review = db.createReview({ ...req.body, client_id: req.params.clientId });
  res.status(201).json({ review });
});

router.post('/reviews/:id/generate-response', async (req, res) => {
  const review = db.getReview(req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  const client = db.getClient(review.client_id);
  try {
    const aiResponse = await claude.generateReviewResponse({
      review, businessName: client.business_name, tone: client.tone,
    });
    db.updateReview(req.params.id, { ai_response: aiResponse, status: 'draft' });
    db.logActivity(client.id, 'ai_response_generated', review.author);
    res.json({ aiResponse, message: 'AI response generated' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate response', details: e.message });
  }
});

router.post('/reviews/:id/publish', (req, res) => {
  const review = db.getReview(req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  const finalResponse = req.body.responseText || review.ai_response;
  if (!finalResponse) return res.status(400).json({ error: 'No response text' });
  db.updateReview(req.params.id, { published_response: finalResponse, status: 'published', responded_at: new Date().toISOString() });
  res.json({ message: 'Response published' });
});

// ── CUSTOMERS ─────────────────────────────────────────────────────────────────
router.get('/clients/:clientId/customers', (req, res) => {
  res.json({ customers: db.getCustomers(req.params.clientId) });
});

router.post('/clients/:clientId/customers', (req, res) => {
  if (!req.body.name) return res.status(400).json({ error: 'name is required' });
  const customer = db.createCustomer({ ...req.body, client_id: req.params.clientId });
  res.status(201).json({ customer });
});

router.post('/customers/:id/preview-message', async (req, res) => {
  const customer = db.getCustomer(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  const client = db.getClient(customer.client_id);
  try {
    const generated = await claude.generateReviewRequestMessage({
      customer, businessName: client.business_name,
      channel: req.body.channel || 'sms', reviewLink: client.review_link,
    });
    res.json(generated);
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate message', details: e.message });
  }
});

router.post('/customers/:id/send-request', async (req, res) => {
  const customer = db.getCustomer(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  const client = db.getClient(customer.client_id);
  const channel = req.body.channel || 'sms';
  try {
    const generated = await claude.generateReviewRequestMessage({
      customer, businessName: client.business_name, channel, reviewLink: client.review_link,
    });
    let result;
    if (channel === 'sms' && customer.phone) {
      result = await sms.sendSMS({ to: customer.phone, body: generated.body });
    } else if (channel === 'email' && customer.email) {
      result = await email.sendEmail({ to: customer.email, subject: generated.subject, body: generated.body, fromName: client.business_name });
    } else {
      return res.status(400).json({ error: `No ${channel} contact for this customer` });
    }
    if (result.success) {
      db.updateCustomer(req.params.id, { request_status: 'sent', request_sent_at: new Date().toISOString() });
      db.logActivity(client.id, 'review_request_sent', `${channel} to ${customer.name}`);
      res.json({ success: true, message: `Request sent via ${channel}`, messageBody: generated.body });
    } else {
      res.status(500).json({ error: 'Failed to send', details: result.error });
    }
  } catch (e) {
    res.status(500).json({ error: 'Failed to send request', details: e.message });
  }
});

// ── SCREENING ─────────────────────────────────────────────────────────────────
router.get('/clients/:clientId/screening', (req, res) => {
  res.json({ queue: db.getScreening(req.params.clientId) });
});

router.post('/clients/:clientId/screening/submit', (req, res) => {
  const { author, rating, text, service } = req.body;
  if (!author || !text) return res.status(400).json({ error: 'author and text required' });
  if (rating < 5) {
    db.logActivity(req.params.clientId, 'private_feedback', `${rating}★ from ${author}`);
    return res.json({ message: 'Thank you for your feedback!', routed: 'private' });
  }
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

// ── REVIEW FORM PAGE ──────────────────────────────────────────────────────────
router.get('/form/:clientId', (req, res) => {
  const client = db.getClient(req.params.clientId);
  const bizName = client ? client.business_name : 'us';
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Rate Your Experience — ${bizName}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;}
    .card{background:white;border-radius:16px;padding:40px;max-width:480px;width:100%;box-shadow:0 4px 20px rgba(0,0,0,0.08);}
    h1{font-size:22px;color:#0f172a;margin-bottom:8px;}
    p{color:#64748b;font-size:15px;line-height:1.6;margin-bottom:24px;}
    .stars{display:flex;gap:8px;margin-bottom:24px;font-size:40px;cursor:pointer;}
    .star{transition:transform 0.1s;color:#e2e8f0;}
    .star.active{color:#f59e0b;}
    .star:hover{transform:scale(1.15);}
    input,textarea{width:100%;border:1.5px solid #e2e8f0;border-radius:10px;padding:12px 14px;font-size:14px;font-family:inherit;color:#0f172a;margin-bottom:14px;}
    input:focus,textarea:focus{outline:none;border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,0.15);}
    textarea{resize:vertical;min-height:110px;}
    button{width:100%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;border:none;border-radius:10px;padding:14px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;}
    button:disabled{opacity:0.5;cursor:not-allowed;}
    .label{font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:8px;}
    .success{text-align:center;padding:20px 0;}
    .success .icon{font-size:60px;margin-bottom:16px;}
    .hidden{display:none;}
    .low-star-msg{background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;padding:16px;margin-bottom:16px;font-size:13px;color:#92400e;line-height:1.6;}
  </style>
</head>
<body>
  <div class="card">
    <div id="form-view">
      <h1>How was your visit?</h1>
      <p>Your feedback helps ${bizName} serve patients better.</p>
      <span class="label">Your rating</span>
      <div class="stars" id="stars">
        <span class="star" data-rating="1">★</span>
        <span class="star" data-rating="2">★</span>
        <span class="star" data-rating="3">★</span>
        <span class="star" data-rating="4">★</span>
        <span class="star" data-rating="5">★</span>
      </div>
      <div id="low-star-msg" class="low-star-msg hidden">We're sorry to hear that. Your feedback goes directly to the team privately — it will never be posted publicly.</div>
      <span class="label">Your name</span>
      <input type="text" id="author" placeholder="First name"/>
      <span class="label">Tell us about your experience</span>
      <textarea id="review-text" placeholder="What did you love? What could be better?"></textarea>
      <button id="submit-btn" disabled onclick="submitReview()">Submit</button>
    </div>
    <div id="success-view" class="success hidden">
      <div class="icon">⭐</div>
      <h1>Thank you!</h1>
      <p style="margin-top:12px;">Your feedback means a lot to us.</p>
    </div>
  </div>
  <script>
    let rating = 0;
    const clientId = '${req.params.clientId}';
    document.querySelectorAll('.star').forEach(s => {
      s.addEventListener('click', () => {
        rating = parseInt(s.dataset.rating);
        document.querySelectorAll('.star').forEach(x => x.className = 'star' + (parseInt(x.dataset.rating) <= rating ? ' active' : ''));
        document.getElementById('low-star-msg').className = 'low-star-msg' + (rating < 5 ? '' : ' hidden');
        updateBtn();
      });
    });
    document.getElementById('author').addEventListener('input', updateBtn);
    document.getElementById('review-text').addEventListener('input', updateBtn);
    function updateBtn() {
      document.getElementById('submit-btn').disabled = !(rating > 0 && document.getElementById('author').value.trim().length > 1 && document.getElementById('review-text').value.trim().length > 10);
    }
    async function submitReview() {
      document.getElementById('submit-btn').disabled = true;
      document.getElementById('submit-btn').textContent = 'Submitting...';
      try {
        await fetch('/api/clients/' + clientId + '/screening/submit', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ author: document.getElementById('author').value.trim(), rating, text: document.getElementById('review-text').value.trim() })
        });
        document.getElementById('form-view').classList.add('hidden');
        document.getElementById('success-view').classList.remove('hidden');
      } catch(e) {
        document.getElementById('submit-btn').disabled = false;
        document.getElementById('submit-btn').textContent = 'Try again';
      }
    }
  </script>
</body>
</html>`);
});

module.exports = router;
