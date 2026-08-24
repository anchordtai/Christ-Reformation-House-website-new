const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();
const { checkDatabaseConnection } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// ==================== ENV SAFETY CHECK ====================
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const FRONTEND_ORIGIN_DONATE =
  process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

if (!FLW_SECRET_KEY) {
  console.warn('⚠️ WARNING: FLW_SECRET_KEY is missing in environment variables');
}

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());

// ==================== HEALTH CHECK ====================
// Used by Render and uptime monitoring. This endpoint does not expose secrets.
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: "Christ's Reformation House API",
    timestamp: new Date().toISOString(),
  });
});

// Secure database connectivity check. Deliberately returns no connection details.
app.get('/health/db', async (req, res) => {
  try {
    await checkDatabaseConnection();
    return res.status(200).json({
      status: 'ok',
      database: 'connected',
    });
  } catch (error) {
    console.error('Database health check failed:', error.message);
    return res.status(503).json({
      status: 'error',
      database: 'disconnected',
    });
  }
});

// ==================== FILE HELPERS ====================
const readJSONFile = (filename) => {
  const filePath = path.join(__dirname, filename);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return [];
};

const writeJSONFile = (filename, data) => {
  const filePath = path.join(__dirname, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// ==================== AUTH ====================
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (email && password) {
    const token = 'mock-jwt-token-' + Date.now();
    const isAdmin = email === 'admin@church.org' || email.endsWith('@admin');

    return res.json({
      token,
      user: {
        email,
        name: 'User',
        role: isAdmin ? 'admin' : 'member',
        isAdmin,
      },
    });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/auth/signup', (req, res) => {
  const { name, email, phone } = req.body;
  const token = 'mock-jwt-token-' + Date.now();

  return res.json({
    token,
    user: { name, email, phone },
  });
});

app.get('/api/auth/me', (req, res) => {
  res.json({ user: { name: 'User', email: 'user@example.com' } });
});

// ==================== SERMONS ====================
app.get('/api/sermons', (req, res) => {
  const sermons = readJSONFile('sermons.json');
  res.json(sermons);
});

app.get('/api/sermons/:id', (req, res) => {
  const sermons = readJSONFile('sermons.json');
  const sermon = sermons.find((s) => s.id === parseInt(req.params.id));

  if (!sermon) return res.status(404).json({ error: 'Sermon not found' });

  res.json(sermon);
});

app.get('/api/sermons/search', (req, res) => {
  const { q } = req.query;
  const sermons = readJSONFile('sermons.json');

  const filtered = sermons.filter(
    (s) =>
      s.title?.toLowerCase().includes(q?.toLowerCase() || '') ||
      s.speaker?.toLowerCase().includes(q?.toLowerCase() || '')
  );

  res.json(filtered);
});

// ==================== EVENTS ====================
app.get('/api/events', (req, res) => {
  res.json(readJSONFile('events.json'));
});

app.get('/api/events/:id', (req, res) => {
  const events = readJSONFile('events.json');
  const event = events.find((e) => e.id === parseInt(req.params.id));

  if (!event) return res.status(404).json({ error: 'Event not found' });

  res.json(event);
});

app.post('/api/events/:id/register', (req, res) => {
  const registrations = readJSONFile('event-registrations.json');

  const registration = {
    id: registrations.length + 1,
    eventId: parseInt(req.params.id),
    ...req.body,
    date: new Date().toISOString(),
  };

  registrations.push(registration);
  writeJSONFile('event-registrations.json', registrations);

  res.json({ success: true, registration });
});

// ==================== BLOG ====================
app.get('/api/blog', (req, res) => {
  res.json(readJSONFile('blog.json'));
});

app.get('/api/blog/:id', (req, res) => {
  const posts = readJSONFile('blog.json');
  const post = posts.find((p) => p.id === parseInt(req.params.id));

  if (!post) return res.status(404).json({ error: 'Post not found' });

  res.json(post);
});

// ==================== DEVOTIONALS ====================
app.get('/api/devotionals', (req, res) => {
  const devotionals = readJSONFile('devotionals.json');
  const { date } = req.query;

  if (date) {
    const devotional = devotionals.find((d) => d.date === date);
    return res.json(devotional || devotionals[0]);
  }

  res.json(devotionals);
});

// ==================== DONATIONS ====================
const DONATION_ALLOWED_CURRENCIES = [
  'NGN',
  'USD',
  'GBP',
  'EUR',
  'GHS',
  'ZAR',
  'KES',
];

function generateTxRef() {
  return 'crh-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');
}

app.post('/api/donations', async (req, res) => {
  console.log('FLW KEY STATUS:', {
    exists: !!process.env.FLW_SECRET_KEY,
  });

  if (!process.env.FLW_SECRET_KEY) {
    return res.status(500).json({
      error: 'Payment configuration error. Contact administrator.',
    });
  }

  try {
    const { amount, currency, donationType, name, email, phone, message } =
      req.body || {};

    const numAmount =
      typeof amount === 'number' ? amount : parseFloat(amount);

    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const currencyCode = (currency || 'NGN').toUpperCase().trim();

    if (!DONATION_ALLOWED_CURRENCIES.includes(currencyCode)) {
      return res.status(400).json({ error: 'Currency not supported' });
    }

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const txRef = generateTxRef();

    const donation = {
      id: Date.now(),
      tx_ref: txRef,
      amount: numAmount,
      currency: currencyCode,
      donationType: donationType || 'general',
      name: name || '',
      email,
      phone: phone || '',
      message: message || '',
      status: 'pending',
      date: new Date().toISOString(),
    };

    const donations = readJSONFile('donations.json');
    donations.push(donation);
    writeJSONFile('donations.json', donations);

    const redirectUrl = `${FRONTEND_ORIGIN_DONATE}/donate/return?tx_ref=${txRef}`;

    const flwPayload = {
      tx_ref: txRef,
      amount: numAmount,
      currency: currencyCode,
      redirect_url: redirectUrl,
      customer: {
        email,
        name: name || 'Donor',
        phonenumber: phone || undefined,
      },
      customizations: {
        title: "Christ's Reformation House - Donation",
        description: donationType || 'Donation',
      },
    };

    const flwRes = await axios.post(
      'https://api.flutterwave.com/v3/payments',
      flwPayload,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        },
        timeout: 15000,
      }
    );

    const data = flwRes.data;

    if (data.status !== 'success') {
      return res.status(502).json({
        error: data.message || 'Payment initialization failed',
      });
    }

    return res.json({
      success: true,
      redirectUrl: data.data?.link,
    });
  } catch (err) {
    console.error('Donation error:', err.response?.data || err.message);

    return res.status(500).json({
      error: 'Payment initiation failed',
    });
  }
});

// ==================== VERIFY ====================
app.post('/api/donations/verify', async (req, res) => {
  const { transaction_id, tx_ref } = req.body || {};

  if (!transaction_id) {
    return res
      .status(400)
      .json({ verified: false, error: 'Missing transaction_id' });
  }

  if (!process.env.FLW_SECRET_KEY) {
    return res.status(500).json({
      verified: false,
      error: 'Payment configuration error',
    });
  }

  try {
    const flwRes = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        },
      }
    );

    const tx = flwRes.data?.data;

    if (!tx || tx.status !== 'successful') {
      return res.json({ verified: false });
    }

    const donations = readJSONFile('donations.json');

    const idx = donations.findIndex(
      (d) => d.tx_ref === (tx_ref || tx.tx_ref)
    );

    if (idx !== -1) {
      donations[idx].status = 'verified';
      writeJSONFile('donations.json', donations);
    }

    return res.json({ verified: true });
  } catch (err) {
    return res.status(500).json({
      verified: false,
      error: 'Verification failed',
    });
  }
});

// ==================== CONTACT ====================
app.post('/api/contact', (req, res) => {
  const messages = readJSONFile('contact-messages.json');

  const message = {
    id: messages.length + 1,
    ...req.body,
    date: new Date().toISOString(),
  };

  messages.push(message);
  writeJSONFile('contact-messages.json', messages);

  res.json({ success: true, message });
});

// ==================== STORE ====================
app.get('/api/store/products', (req, res) => {
  res.json(readJSONFile('store-products.json'));
});

// ==================== START SERVER ====================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log('API available at /api');
});
