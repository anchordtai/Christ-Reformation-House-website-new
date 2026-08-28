const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();
const {
  checkSupabaseConnection,
  getActiveDonationType,
  createDonation,
  getDonationByTxRef,
  updateDonationById,
  createPaymentEvent,
} = require('./supabase');

const app = express();
const PORT = process.env.PORT || 5000;

const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const FLW_WEBHOOK_SECRET_HASH = process.env.FLW_WEBHOOK_SECRET_HASH;
const FRONTEND_ORIGIN_DONATE = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

if (!FLW_SECRET_KEY) console.warn('⚠️ WARNING: FLW_SECRET_KEY is missing in environment variables');
if (!FLW_WEBHOOK_SECRET_HASH) console.warn('⚠️ WARNING: FLW_WEBHOOK_SECRET_HASH is missing; webhook verification is disabled until configured');

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

// Keep the exact request bytes so the Flutterwave webhook signature can be verified.
app.use(express.json({
  limit: '100kb',
  verify: (req, res, buf) => { req.rawBody = Buffer.from(buf); },
}));

app.get('/health', (req, res) => res.status(200).json({
  status: 'ok', service: "Christ's Reformation House API", timestamp: new Date().toISOString(),
}));

app.get('/health/db', async (req, res) => {
  try {
    await checkSupabaseConnection();
    return res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Supabase health check failed:', error.message);
    return res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

// Existing content endpoints remain available.
const readJSONFile = (filename) => {
  const filePath = path.join(__dirname, filename);
  if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return [];
};
app.get('/api/sermons', (req, res) => res.json(readJSONFile('sermons.json')));
app.get('/api/sermons/:id', (req, res) => {
  const sermon = readJSONFile('sermons.json').find((s) => s.id === Number.parseInt(req.params.id, 10));
  if (!sermon) return res.status(404).json({ error: 'Sermon not found' });
  return res.json(sermon);
});
app.get('/api/events', (req, res) => res.json(readJSONFile('events.json')));
app.get('/api/blog', (req, res) => res.json(readJSONFile('blog.json')));
app.get('/api/devotionals', (req, res) => res.json(readJSONFile('devotionals.json')));
app.get('/api/store/products', (req, res) => res.json(readJSONFile('store-products.json')));

const isValidEmail = (email) => typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidCurrency = (currency) => ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'ZAR', 'KES'].includes(currency);
const makeTxRef = () => `crh-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;

// Creates a PENDING donation before redirecting the donor to Flutterwave.
app.post('/api/donations', async (req, res) => {
  if (!FLW_SECRET_KEY) return res.status(503).json({ error: 'Payment service is not configured' });

  const { amount, currency = 'NGN', donationType, name, email, phone, message } = req.body || {};
  const numAmount = typeof amount === 'number' ? amount : Number(amount);
  const currencyCode = String(currency).toUpperCase().trim();
  const donationCode = String(donationType || '').trim().slice(0, 80);

  if (!Number.isFinite(numAmount) || numAmount <= 0 || numAmount > 100000000) return res.status(400).json({ error: 'Invalid amount' });
  if (!isValidCurrency(currencyCode)) return res.status(400).json({ error: 'Currency not supported' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
  if (!donationCode) return res.status(400).json({ error: 'Donation type is required' });

  try {
    const type = await getActiveDonationType(donationCode);
    if (!type) return res.status(400).json({ error: 'Invalid or inactive donation type' });

    const txRef = makeTxRef();
    const donation = await createDonation({
      donor_name: String(name || 'Donor').trim().slice(0, 120),
      email: email.trim().toLowerCase(),
      phone: phone ? String(phone).trim().slice(0, 40) : null,
      amount: numAmount,
      currency: currencyCode,
      donation_type: type.code,
      message: message ? String(message).trim().slice(0, 1000) : null,
      tx_ref: txRef,
      payment_method: 'flutterwave',
      status: 'pending',
      verification_attempts: 0,
      metadata: { donation_type_id: type.id },
    });

    if (!donation) return res.status(502).json({ error: 'Unable to create donation record' });

    const redirectUrl = `${FRONTEND_ORIGIN_DONATE.replace(/\/$/, '')}/donate/return?tx_ref=${encodeURIComponent(txRef)}`;
    const flwRes = await axios.post('https://api.flutterwave.com/v3/payments', {
      tx_ref: txRef,
      amount: numAmount,
      currency: currencyCode,
      redirect_url: redirectUrl,
      customer: {
        email: email.trim().toLowerCase(),
        name: String(name || 'Donor').trim().slice(0, 120),
        ...(phone ? { phonenumber: String(phone).trim().slice(0, 40) } : {}),
      },
      customizations: {
        title: "Christ's Reformation House - Donation",
        description: String(type.name || 'Donation').slice(0, 120),
      },
    }, { headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` }, timeout: 15000 });

    if (flwRes.data?.status !== 'success' || !flwRes.data?.data?.link) {
      await updateDonationById(donation.id, { status: 'failed', failure_reason: 'Payment initialization failed' });
      return res.status(502).json({ error: 'Payment initialization failed' });
    }

    return res.status(200).json({ success: true, redirectUrl: flwRes.data.data.link, tx_ref: txRef });
  } catch (error) {
    console.error('Donation initialization failed:', error.response?.status || error.message);
    return res.status(502).json({ error: 'Payment initiation failed' });
  }
});

async function verifyFlutterwaveTransaction(transactionId, expectedDonation) {
  const response = await axios.get(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`, {
    headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` }, timeout: 15000,
  });
  const data = response.data?.data;
  if (response.data?.status !== 'success' || !data) throw new Error('Flutterwave verification failed');

  const verified = data.status === 'successful'
    && String(data.tx_ref) === String(expectedDonation.tx_ref)
    && String(data.currency).toUpperCase() === String(expectedDonation.currency).toUpperCase()
    && Number(data.amount) >= Number(expectedDonation.amount);

  return { verified, data };
}

// Server-side verification endpoint. Browser return parameters are never trusted as proof of payment.
app.get('/api/payments/verify', async (req, res) => {
  const txRef = String(req.query.tx_ref || '').trim();
  const transactionId = String(req.query.transaction_id || '').trim();
  if (!txRef || !transactionId) return res.status(400).json({ error: 'tx_ref and transaction_id are required' });

  try {
    const donation = await getDonationByTxRef(txRef);
    if (!donation) return res.status(404).json({ error: 'Donation not found' });
    if (donation.status === 'successful') return res.json({ success: true, status: 'successful' });

    const attempts = Number(donation.verification_attempts || 0) + 1;
    const result = await verifyFlutterwaveTransaction(transactionId, donation);

    if (!result.verified) {
      await updateDonationById(donation.id, {
        verification_attempts: attempts,
        status: result.data.status === 'cancelled' ? 'cancelled' : 'failed',
        flutterwave_transaction_id: String(result.data.id || transactionId),
        flutterwave_reference: result.data.flw_ref || null,
        failure_reason: 'Transaction verification did not match expected donation details',
        verified_at: null,
      });
      return res.status(400).json({ success: false, status: 'failed' });
    }

    await updateDonationById(donation.id, {
      status: 'successful',
      verification_attempts: attempts,
      flutterwave_transaction_id: String(result.data.id || transactionId),
      flutterwave_reference: result.data.flw_ref || null,
      payment_method: result.data.payment_type || donation.payment_method,
      verified_at: new Date().toISOString(),
      failure_reason: null,
    });
    await createPaymentEvent({
      donation_id: donation.id,
      event_type: 'transaction_verified',
      provider: 'flutterwave',
      provider_transaction_id: String(result.data.id || transactionId),
      status: 'successful',
      payload: { status: result.data.status, tx_ref: result.data.tx_ref, amount: result.data.amount, currency: result.data.currency },
    });

    return res.json({ success: true, status: 'successful' });
  } catch (error) {
    console.error('Payment verification failed:', error.response?.status || error.message);
    return res.status(502).json({ error: 'Payment verification failed' });
  }
});

// Flutterwave webhook. Configure the same secret hash in the Flutterwave dashboard and Render.
app.post('/api/payments/webhook', async (req, res) => {
  if (!FLW_WEBHOOK_SECRET_HASH) return res.status(503).json({ error: 'Webhook verification is not configured' });

  const signature = req.headers['flutterwave-signature'];
  if (typeof signature !== 'string' || !req.rawBody) return res.status(401).json({ error: 'Invalid webhook signature' });

  const expected = crypto.createHmac('sha256', FLW_WEBHOOK_SECRET_HASH).update(req.rawBody).digest('hex');
  const received = Buffer.from(signature, 'utf8');
  const calculated = Buffer.from(expected, 'utf8');
  if (received.length !== calculated.length || !crypto.timingSafeEqual(received, calculated)) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  const event = req.body || {};
  const data = event.data || {};
  const txRef = String(data.tx_ref || '').trim();
  if (!txRef) return res.status(400).json({ error: 'Webhook transaction reference missing' });

  try {
    const donation = await getDonationByTxRef(txRef);
    if (!donation) return res.status(200).json({ received: true });

    const providerId = data.id ? String(data.id) : null;
    await createPaymentEvent({
      donation_id: donation.id,
      event_type: String(event.event || 'webhook').slice(0, 100),
      provider: 'flutterwave',
      provider_transaction_id: providerId,
      status: String(data.status || 'received').slice(0, 50),
      payload: event,
    });

    if (data.status === 'successful' && providerId) {
      const result = await verifyFlutterwaveTransaction(providerId, donation);
      if (result.verified && donation.status !== 'successful') {
        await updateDonationById(donation.id, {
          status: 'successful',
          flutterwave_transaction_id: providerId,
          flutterwave_reference: result.data.flw_ref || null,
          payment_method: result.data.payment_type || donation.payment_method,
          verified_at: new Date().toISOString(),
          webhook_received_at: new Date().toISOString(),
          webhook_payload: event,
          failure_reason: null,
        });
      }
    } else {
      await updateDonationById(donation.id, { webhook_received_at: new Date().toISOString(), webhook_payload: event });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing failed:', error.response?.status || error.message);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

app.use((err, req, res, next) => {
  if (err?.message === 'Origin not allowed by CORS') return res.status(403).json({ error: 'Origin not allowed' });
  console.error('Unhandled server error:', err?.message || err);
  return res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log('API available at /api');
});
