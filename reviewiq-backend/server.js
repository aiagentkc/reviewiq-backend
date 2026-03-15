// server.js — ReviewIQ Backend
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const routes = require('./routes/index');
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3001;

// Security
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// CORS
app.use(cors({ origin: '*', credentials: true }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const color = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
    console.log(`${color}${req.method}\x1b[0m ${req.path} — ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// Routes
app.use('/api', routes);

// Root
app.get('/', (req, res) => {
  res.json({ service: 'ReviewIQ Backend', status: 'running', version: '1.0.0' });
});

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

// Start
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║      ReviewIQ Backend Running         ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`\n🚀 Port:     ${PORT}`);
  console.log(`📋 Health:   /api/health`);
  console.log(`\nIntegrations:`);
  console.log(`  ${process.env.ANTHROPIC_API_KEY ? '✅' : '❌'} Claude AI`);
  console.log(`  ${process.env.TWILIO_ACCOUNT_SID ? '✅' : '❌'} Twilio SMS`);
  console.log(`  ${process.env.EMAIL_FROM ? '✅' : '❌'} Email`);
  console.log('\n✅ Ready!\n');

  // Seed demo data
  db.seedDemoData();
});
