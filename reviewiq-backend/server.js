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

// Security — allow inline scripts for the review form
app.use(helmet({
  contentSecurityPolicy: false,
}));

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const color = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
    console.log(`${color}${req.method}\x1b[0m ${req.path} — ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({ service: 'ReviewIQ Backend', status: 'running', version: '1.0.0' });
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Server error' }); });

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║      ReviewIQ Backend Running         ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`\n🚀 Port:     ${PORT}`);
  console.log(`\nIntegrations:`);
  console.log(`  ${process.env.ANTHROPIC_API_KEY ? '✅' : '❌'} Claude AI`);
  console.log(`  ${process.env.TWILIO_ACCOUNT_SID ? '✅' : '❌'} Twilio SMS`);
  console.log(`  ${process.env.EMAIL_FROM ? '✅' : '❌'} Email`);
  console.log('\n✅ Ready!\n');
  db.seedDemoData();
});
