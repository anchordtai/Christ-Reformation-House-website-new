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
const { getAccessToken, createDirectCharge, retrieveCharge } = require('./flutterwave');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
const FLW_WEBHOOK_SECRET_HASH = process.env.FLW_WEBHOOK_SECRET_HASH;

const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', FRONTEND_ORIGIN]
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Preserve the exact request bytes for Flutterwave HMAC-SHA256 webhook verification.
app.use(express.json({
  limit: '100kb',
  verify: (req, res, buf) => { req.rawBody = Buffer.from(buf); },
}));

app.get('/health', (req, res) => res.status(200).json({
  status: 'ok',
  service: "Christ's Reformation House API",
  timestamp: new Date().toISOString(),
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

// Confirms that the V4 OAuth credentials work without exposing the access token.
app.get('/health/flutterwave', async (req, res) => {
  try {
    await getAccessToken();
    return res.status(200).json({ status: 'ok', provider: 'flutterwave', api: 'v4' });
  } catch (error) {
    console.error('Flutterwave V4 health check failed:', error.response?.status || error.message);
    return res.status(503).json({ status: 'error', provider: 'flutterwave', api: 'v4' });
  }
});

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
const makeIdempotencyKey = () => crypto.randomBytes(24).toString('hex');

// Flutterwave V4: creates a pending Supabase donation, then initiates a V4 direct charge.
// paymentMethod must contain only Flutterwave-approved payment data; raw card data must be
// encrypted/tokenized according to Flutterwave's V4 client-side integration before submission.
app.post('/api/donations', async (req, res) => {
  const { amount, currency = 'NGN', donationType, name, email, phone, message, paymentMethod } = req.body || {};
  const numAmount = typeof amount === 'number' ? amount : Number(amount);
  const currencyCode = String(currency).toUpperCase().trim();
  const donationCode = String(donationType || '').trim().slice(0, 80);

  if (!Number.isFinite(numAmount) || numAmount <= 0 || numAmount > 100000000) return res.status(400).json({ error: 'Invalid amount' });
  if (!isValidCurrency(currencyCode)) return res.status(400).json({ error: 'Currency not supported' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
  if (!donationCode) return res.status(400).json({ error: 'Donation type is required' });
  if (!paymentMethod || typeof paymentMethod !== 'object' || Array.isArray(paymentMethod)) {
    return res.status(400).json({ error: 'Flutterwave payment method is required' });
  }

  try {
    const type = await getActiveDonationType(donationCode);
    if (!type) return res.status(400).json({ error: 'Invalid or inactive donation type' });

    const txRef = makeTxRef();
    const redirectUrl = `${FRONTEND_ORIGIN.replace(/\/$/, '')}/donate/return?tx_ref=${encodeURIComponent(txRef)}`;

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

    const customer = {
      email: email.trim().toLowerCase(),
      name: String(name || 'Donor').trim().slice(0, 120),
      ...(phone ? { phone: { country_code: '234', number: String(phone).replace(/\D/g, '').slice(-15) } } : {}),
    };

    const chargeResponse = await createDirectCharge({
      amount: numAmount,
      currency: currencyCode,
      reference: txRef,
      customer,
      paymentMethod,
      redirectUrl,
      idempotencyKey: makeIdempotencyKey(),
    });

    const charge = chargeResponse.data?.data || chargeResponse.data;
    if (!charge?.id) {
      await updateDonationById(donation.id, { status: 'failed', failure_reason: 'Flutterwave V4 charge was not created' });
      return res.status(502).json({ error: 'Payment initialization failed' });
    }

    await updateDonationById(donation.id, {
      flutterwave_transaction_id: String(charge.id),
      status: charge.status === 'succeeded' ? 'successful' : 'pending',
      metadata: { donation_type_id: type.id, flutterwave_charge_id: String(charge.id) },
    });

    await createPaymentEvent({
      donation_id: donation.id,
      event_type: 'charge_created',
      provider: 'flutterwave',
      provider_transaction_id: String(charge.id),
      status: String(charge.status || 'pending'),
      payload: { id: charge.id, reference: charge.reference, status: charge.status, amount: charge.amount, currency: charge.currency },
    });

    return res.status(200).json({
      success: true,
      tx_ref: txRef,
      charge_id: String(charge.id),
      status: charge.status || 'pending',
      next_action: charge.next_action || null,
      redirect_url: charge.redirect_url || redirectUrl,
    });
  } catch (error) {
    console.error('Flutterwave V4 payment initialization failed:', error.response?.status || error.message);
    return res.status(502).json({ error: 'Payment initiation failed' });
  }
});

// V4 charge verification: retrieves the charge and checks reference, amount, currency and status.
app.get('/api/payments/verify', async (req, res) => {
  const txRef = String(req.query.tx_ref || '').trim();
  const chargeId = String(req.query.charge_id || '').trim();
  if (!txRef || !chargeId) return res.status(400).json({ error: 'tx_ref and charge_id are required' });

  try {
    const donation = await getDonationByTxRef(txRef);
    if (!donation) return res.status(404).json({ error: 'Donation not found' });

    const response = await retrieveCharge(chargeId);
    const charge = response.data?.data || response.data;
    const amountMatches = Number(charge?.amount) === Number(donation.amount);
    const currencyMatches = String(charge?.currency || '').toUpperCase() === String(donation.currency || '').toUpperCase();
    const referenceMatches = String(charge?.reference || '') === String(donation.tx_ref || '');
    const successful = charge?.status === 'succeeded' && amountMatches && currencyMatches && referenceMatches;
    const attempts = Number(donation.verification_attempts || 0) + 1;

    await updateDonationById(donation.id, {
      verification_attempts: attempts,
      flutterwave_transaction_id: String(charge?.id || chargeId),
      status: successful ? 'successful' : (['failed', 'cancelled'].includes(charge?.status) ? charge.status : 'pending'),
      verified_at: successful ? new Date().toISOString() : null,
      failure_reason: successful ? null : 'Flutterwave V4 verification did not match the expected transaction',
    });

    if (successful) {
      await createPaymentEvent({
        donation_id: donation.id,
        event_type: 'charge_verified',
        provider: 'flutterwave',
        provider_transaction_id: String(charge.id),
        status: 'succeeded',
        payload: { id: charge.id, reference: charge.reference, amount: charge.amount, currency: charge.currency, status: charge.status },
      });
    }

    return res.json({ success: successful, status: successful ? 'successful' : (charge?.status || 'pending'), tx_ref: donation.tx_ref });
  } catch (error) {
    console.error('Flutterwave V4 verification failed:', error.response?.status || error.message);
    return res.status(502).json({ error: 'Payment verification failed' });
  }
});

// V4 webhook signature verification. Flutterwave signs the raw body using HMAC-SHA256 and
// returns the base64 digest in the flutterwave-signature header.
app.post('/api/payments/webhook', async (req, res) => {
  if (!FLW_WEBHOOK_SECRET_HASH) return res.status(503).json({ error: 'Webhook verification is not configured' });

  const signature = req.headers['flutterwave-signature'];
  if (typeof signature !== 'string' || !req.rawBody) return res.status(401).json({ error: 'Invalid webhook signature' });

  const expected = crypto.createHmac('sha256', FLW_WEBHOOK_SECRET_HASH).update(req.rawBody).digest('base64');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Invalid webhook signature' });

  const event = req.body || {};
  const data = event.data || {};
  const txRef = String(data.reference || '').trim();
  const chargeId = String(data.id || '').trim();
  if (!txRef || !chargeId) return res.status(400).json({ error: 'Webhook transaction data missing' });

  try {
    const donation = await getDonationByTxRef(txRef);
    if (!donation) return res.status(200).json({ received: true });

    // Always re-query Flutterwave before changing the donation to successful.
    const response = await retrieveCharge(chargeId);
    const charge = response.data?.data || response.data;
    const valid = charge?.status === 'succeeded'
      && String(charge.reference) === String(donation.tx_ref)
      && Number(charge.amount) === Number(donation.amount)
      && String(charge.currency).toUpperCase() === String(donation.currency).toUpperCase();

    await createPaymentEvent({
      donation_id: donation.id,
      event_type: String(event.type || 'charge.completed').slice(0, 100),
      provider: 'flutterwave',
      provider_transaction_id: chargeId,
      status: String(charge?.status || 'received').slice(0, 50),
      payload: { id: data.id, reference: data.reference, status: data.status, amount: data.amount, currency: data.currency },
    });

    const updates = {
      webhook_received_at: new Date().toISOString(),
      webhook_payload: { id: event.id || null, type: event.type || null, data: { id: data.id, reference: data.reference, status: data.status, amount: data.amount, currency: data.currency } },
      flutterwave_transaction_id: chargeId,
    };

    if (valid && donation.status !== 'successful') {
      updates.status = 'successful';
      updates.verified_at = new Date().toISOString();
      updates.failure_reason = null;
    }

    await updateDonationById(donation.id, updates);
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Flutterwave webhook processing failed:', error.response?.status || error.message);
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
