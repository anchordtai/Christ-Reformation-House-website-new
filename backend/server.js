const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();
const { checkSupabaseConnection } = require('./supabase');

const app = express();
const PORT = process.env.PORT || 5000;

const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const FRONTEND_ORIGIN_DONATE = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

if (!FLW_SECRET_KEY) {
  console.warn('⚠️ WARNING: FLW_SECRET_KEY is missing in environment variables');
}

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  FRONTEND_ORIGIN_DONATE,
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '100kb' }));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: "Christ's Reformation House API",
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/db', async (req, res) => {
  try {
    await checkSupabaseConnection();
    return res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Supabase health check failed:', error.message);
    return res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

const readJSONFile = (filename) => {
  const filePath = path.join(__dirname, filename);
  if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return [];
};

const writeJSONFile = (filename, data) => {
  fs.writeFileSync(path.join(__dirname, filename), JSON.stringify(data, null, 2));
};

app.get('/api/sermons', (req, res) => res.json(readJSONFile('sermons.json')));
app.get('/api/sermons/:id', (req, res) => {
  const sermon = readJSONFile('sermons.json').find((s) => s.id === parseInt(req.params.id));
  if (!sermon) return res.status(404).json({ error: 'Sermon not found' });
  res.json(sermon);
});
app.get('/api/events', (req, res) => res.json(readJSONFile('events.json')));
app.get('/api/blog', (req, res) => res.json(readJSONFile('blog.json')));
app.get('/api/devotionals', (req, res) => res.json(readJSONFile('devotionals.json')));
app.get('/api/store/products', (req, res) => res.json(readJSONFile('store-products.json')));

app.post('/api/donations', async (req, res) => {
  if (!FLW_SECRET_KEY) {
    return res.status(500).json({ error: 'Payment configuration error. Contact administrator.' });
  }

  const { amount, currency, donationType, name, email, phone } = req.body || {};
  const numAmount = typeof amount === 'number' ? amount : Number(amount);
  const allowedCurrencies = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'ZAR', 'KES'];
  const currencyCode = String(currency || 'NGN').toUpperCase().trim();

  if (!Number.isFinite(numAmount) || numAmount <= 0 || numAmount > 100000000) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  if (!allowedCurrencies.includes(currencyCode)) {
    return res.status(400).json({ error: 'Currency not supported' });
  }
  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  const txRef = `crh-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
  const redirectUrl = `${FRONTEND_ORIGIN_DONATE.replace(/\/$/, '')}/donate/return?tx_ref=${encodeURIComponent(txRef)}`;

  try {
    const flwRes = await axios.post('https://api.flutterwave.com/v3/payments', {
      tx_ref: txRef,
      amount: numAmount,
      currency: currencyCode,
      redirect_url: redirectUrl,
      customer: { email, name: String(name || 'Donor').slice(0, 120), phonenumber: phone ? String(phone).slice(0, 40) : undefined },
      customizations: {
        title: "Christ's Reformation House - Donation",
        description: String(donationType || 'Donation').slice(0, 120),
      },
    }, {
      headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` },
      timeout: 15000,
    });

    if (flwRes.data?.status !== 'success' || !flwRes.data?.data?.link) {
      return res.status(502).json({ error: 'Payment initialization failed' });
    }

    return res.status(200).json({ success: true, redirectUrl: flwRes.data.data.link, tx_ref: txRef });
  } catch (error) {
    console.error('Payment initialization failed:', error.response?.status || error.message);
    return res.status(502).json({ error: 'Payment initiation failed' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log('API available at /api');
});
