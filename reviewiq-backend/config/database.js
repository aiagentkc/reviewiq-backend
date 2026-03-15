// config/database.js
// Simple in-memory database — no installation required, works everywhere
// Data resets when server restarts — upgrade to PostgreSQL later when needed

const { v4: uuidv4 } = require('uuid');

// ── IN-MEMORY STORE ───────────────────────────────────────────────────────────
const db = {
  clients: [],
  customers: [],
  reviews: [],
  screening: [],
  messages: [],
  activity: [],
};

// ── CLIENTS ───────────────────────────────────────────────────────────────────
function getClients() { return db.clients.filter(c => c.active); }
function getClient(id) { return db.clients.find(c => c.id === id); }
function createClient(data) {
  const client = {
    id: uuidv4(),
    business_name: data.business_name,
    owner_name: data.owner_name || '',
    email: data.email || '',
    phone: data.phone || '',
    plan: data.plan || 'starter',
    tone: data.tone || 'professional',
    review_link: data.review_link || '',
    auto_send: data.auto_send || false,
    send_delay_hours: data.send_delay_hours || 2,
    active: true,
    created_at: new Date().toISOString(),
  };
  db.clients.push(client);
  return client;
}
function updateClient(id, data) {
  const i = db.clients.findIndex(c => c.id === id);
  if (i === -1) return null;
  db.clients[i] = { ...db.clients[i], ...data, updated_at: new Date().toISOString() };
  return db.clients[i];
}

// ── CUSTOMERS ─────────────────────────────────────────────────────────────────
function getCustomers(clientId) { return db.customers.filter(c => c.client_id === clientId); }
function getCustomer(id) { return db.customers.find(c => c.id === id); }
function createCustomer(data) {
  const customer = {
    id: uuidv4(),
    client_id: data.client_id,
    name: data.name,
    phone: data.phone || '',
    email: data.email || '',
    service: data.service || '',
    appointment_date: data.appointment_date || '',
    request_status: 'scheduled',
    request_sent_at: null,
    created_at: new Date().toISOString(),
  };
  db.customers.push(customer);
  return customer;
}
function updateCustomer(id, data) {
  const i = db.customers.findIndex(c => c.id === id);
  if (i === -1) return null;
  db.customers[i] = { ...db.customers[i], ...data };
  return db.customers[i];
}

// ── REVIEWS ───────────────────────────────────────────────────────────────────
function getReviews(clientId, status) {
  let reviews = db.reviews.filter(r => r.client_id === clientId);
  if (status) reviews = reviews.filter(r => r.status === status);
  return reviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}
function getReview(id) { return db.reviews.find(r => r.id === id); }
function createReview(data) {
  const review = {
    id: uuidv4(),
    client_id: data.client_id,
    author: data.author,
    rating: data.rating,
    text: data.text || '',
    review_date: data.review_date || new Date().toISOString(),
    ai_response: null,
    published_response: null,
    status: 'pending',
    created_at: new Date().toISOString(),
  };
  db.reviews.push(review);
  return review;
}
function updateReview(id, data) {
  const i = db.reviews.findIndex(r => r.id === id);
  if (i === -1) return null;
  db.reviews[i] = { ...db.reviews[i], ...data };
  return db.reviews[i];
}

// ── SCREENING ─────────────────────────────────────────────────────────────────
function getScreening(clientId) {
  return db.screening
    .filter(s => s.client_id === clientId)
    .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
}
function createScreening(data) {
  const item = {
    id: uuidv4(),
    client_id: data.client_id,
    author: data.author,
    rating: data.rating || 5,
    text: data.text,
    service: data.service || '',
    submitted_at: new Date().toISOString(),
    approved: null,
  };
  db.screening.push(item);
  return item;
}
function updateScreening(id, data) {
  const i = db.screening.findIndex(s => s.id === id);
  if (i === -1) return null;
  db.screening[i] = { ...db.screening[i], ...data };
  return db.screening[i];
}

// ── STATS ─────────────────────────────────────────────────────────────────────
function getStats(clientId) {
  const reviews = db.reviews.filter(r => r.client_id === clientId);
  const responded = reviews.filter(r => r.status === 'published');
  const screening = db.screening.filter(s => s.client_id === clientId && s.approved === null);
  const customers = db.customers.filter(c => c.client_id === clientId);
  const avgRating = reviews.length
    ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
    : null;
  return {
    totalReviews: reviews.length,
    avgRating,
    responseRate: reviews.length ? Math.round((responded.length / reviews.length) * 100) : 0,
    pendingScreening: screening.length,
    requestsSent: customers.filter(c => c.request_status !== 'scheduled').length,
  };
}

// ── ACTIVITY LOG ──────────────────────────────────────────────────────────────
function logActivity(clientId, action, details) {
  db.activity.push({ id: uuidv4(), client_id: clientId, action, details, created_at: new Date().toISOString() });
}

// ── SEED DEMO DATA ────────────────────────────────────────────────────────────
function seedDemoData() {
  const clientId = uuidv4();
  db.clients.push({
    id: clientId, business_name: 'Moss Run PT', owner_name: 'Dr. Jack Moss',
    email: 'jack@mossrunpt.com', phone: '', plan: 'growth', tone: 'professional',
    review_link: '', auto_send: false, send_delay_hours: 2,
    active: true, created_at: new Date().toISOString(),
  });
  const reviews = [
    { author: 'Sarah M.', rating: 5, text: 'Absolutely incredible experience! Came in with knee pain and left feeling like a new person. Dr. Moss really took the time to explain everything.' },
    { author: 'Mike T.', rating: 4, text: 'Really good service overall. Wait time was a little longer than expected but the quality of care made up for it.' },
    { author: 'Jennifer L.', rating: 2, text: 'Was disappointed with my visit. Felt rushed and my concerns were not fully addressed.' },
    { author: 'Carlos R.', rating: 5, text: 'Best PT clinic I have ever been to! The personalized treatment plan made a huge difference.' },
  ];
  reviews.forEach(r => db.reviews.push({ id: uuidv4(), client_id: clientId, ...r, ai_response: null, published_response: null, status: 'pending', review_date: new Date().toISOString(), created_at: new Date().toISOString() }));
  db.screening.push({ id: uuidv4(), client_id: clientId, author: 'Emily Santos', rating: 5, text: 'Life changing! After just 3 sessions I am finally pain-free. Jack truly cares about his patients.', service: 'Gait Analysis', submitted_at: new Date().toISOString(), approved: null });
  console.log('✅ Demo data seeded — Client ID:', clientId);
  return clientId;
}

module.exports = {
  getClients, getClient, createClient, updateClient,
  getCustomers, getCustomer, createCustomer, updateCustomer,
  getReviews, getReview, createReview, updateReview,
  getScreening, createScreening, updateScreening,
  getStats, logActivity, seedDemoData,
};
