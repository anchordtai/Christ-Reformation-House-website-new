const express = require('express');
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
const {
  getAccessToken,
  createDirectCharge,
  createCharge,
  retrieveCharge,
} = require('./flutterwave');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_ORIGIN = String(process.env.FRONTEND_ORIGIN || 'http://localhost:3000').trim().replace(/\/$/, '');
const FLW_WEBHOOK_SECRET_HASH = String(process.env.FLW_WEBHOOK_SECRET_HASH || '').trim();
const FLW_ENCRYPTION_KEY = String(process.env.FLW_ENCRYPTION_KEY || '').trim();

// Only explicitly trusted browser origins are allowed.
// Both the apex and www production domains are supported.
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  FRONTEND_ORIGIN,
  'https://christreformationhouse.org.ng',
  'https://www.christreformationhouse.org.ng',
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

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

app.get('/health/flutterwave', async (req, res) => {
  try {
    await getAccessToken();
    return res.status(200).json({ status: 'ok', provider: 'flutterwave', api: 'v4' });
  } catch (error) {
    const configured = Boolean(process.env.FLW_CLIENT_ID && process.env.FLW_CLIENT_SECRET);
    const providerStatus = Number.isInteger(error.providerStatus) ? error.providerStatus : null;
    console.error('Flutterwave V4 health check failed:', {
      code: error.code || 'UNKNOWN',
      providerStatus,
      credentialsConfigured: configured,
    });
    return res.status(503).json({
      status: 'error',
      provider: 'flutterwave',
      api: 'v4',
      stage: error.code === 'MISSING_CREDENTIALS' ? 'configuration' : 'oauth',
      credentials_configured: configured,
      provider_status: providerStatus,
    });
  }
});

app.get('/api/payments/config', (req, res) => res.json({
  provider: 'flutterwave',
  api: 'v4',
  card_encryption_enabled: Boolean(process.env.FLW_ENCRYPTION_KEY),
}));

const readJSONFile = (filename) => {
  const filePath = path.join(__dirname, filename);
  if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return [];
};

app.get('/api/sermons', (req, res) => res.json(readJSONFile('sermons.json')));
app.get('/api/sermons/:id', (req, res) => {
  const item = readJSONFile('sermons.json').find((s) => s.id === Number.parseInt(req.params.id, 10));
  if (!item) return res.status(404).json({ error: 'Sermon not found' });
  return res.json(item);
});
app.get('/api/events', (req, res) => res.json(readJSONFile('events.json')));
app.get('/api/blog', (req, res) => res.json(readJSONFile('blog.json')));
app.get('/api/devotionals', (req, res) => res.json(readJSONFile('devotionals.json')));
app.get('/api/store/products', (req, res) => res.json(readJSONFile('store-products.json')));

const isValidEmail = (email) => typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidCurrency = (currency) => ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'ZAR', 'KES'].includes(currency);
const makeTxRef = () => `crh-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
const makeIdempotencyKey = () => crypto.randomBytes(24).toString('hex');

function safePaymentMethod(paymentMethod) {
  if (!paymentMethod || typeof paymentMethod !== 'object' || Array.isArray(paymentMethod)) return null;
  const serialized = JSON.stringify(paymentMethod);
  if (serialized.length > 50000) return null;
  const forbidden = ['card_number', 'cvv', 'cvc', 'pin', 'expiry', 'expiry_month', 'expiry_year'];
  if (forbidden.some((key) => Object.prototype.hasOwnProperty.call(paymentMethod, key))) return null;
  return paymentMethod;
}

async function getDonationOr404(txRef, res) {
  const donation = await getDonationByTxRef(txRef);
  if (!donation) {
    res.status(404).json({ error: 'Donation not found' });
    return null;
  }
  return donation;
}

async function verifyChargeAgainstDonation(donation, charge) {
  return Boolean(
    charge?.status === 'succeeded' &&
    String(charge.reference || '') === String(donation.tx_ref || '') &&
    Number(charge.amount) === Number(donation.amount) &&
    String(charge.currency || '').toUpperCase() === String(donation.currency || '').toUpperCase()
  );
}

app.post('/api/donations', async (req, res) => {
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
    return res.status(201).json({ success: true, donation_id: donation.id, tx_ref: txRef, status: 'pending' });
  } catch (error) {
    console.error('Donation creation failed:', error.message);
    return res.status(502).json({ error: 'Unable to create donation' });
  }
});

app.post('/api/payments/initialize', async (req, res) => {
  const { tx_ref: txRef, paymentMethod, customerId, paymentMethodId } = req.body || {};
  if (!txRef || typeof txRef !== 'string') return res.status(400).json({ error: 'tx_ref is required' });
  try {
    const donation = await getDonationOr404(txRef.trim(), res);
    if (!donation) return;
    if (donation.status === 'successful') return res.status(409).json({ error: 'Donation is already successful' });
    const redirectUrl = `${FRONTEND_ORIGIN}/donate/return?tx_ref=${encodeURIComponent(donation.tx_ref)}`;
    const customer = {
      email: donation.email,
      name: donation.donor_name || 'Donor',
      ...(donation.phone ? { phone: { country_code: '234', number: String(donation.phone).replace(/\D/g, '').slice(-15) } } : {}),
    };
    let chargeResponse;
    if (customerId && paymentMethodId) {
      chargeResponse = await createCharge({
        amount: Number(donation.amount),
        currency: String(donation.currency).toUpperCase(),
        reference: donation.tx_ref,
        customerId: String(customerId),
        paymentMethodId: String(paymentMethodId),
        redirectUrl,
        meta: { donation_id: String(donation.id) },
        idempotencyKey: makeIdempotencyKey(),
      });
    } else {
      const sanitizedPaymentMethod = safePaymentMethod(paymentMethod);
      if (!sanitizedPaymentMethod) return res.status(400).json({ error: 'A Flutterwave V4 payment method is required' });
      chargeResponse = await createDirectCharge({
        amount: Number(donation.amount),
        currency: String(donation.currency).toUpperCase(),
        reference: donation.tx_ref,
        customer,
        paymentMethod: sanitizedPaymentMethod,
        redirectUrl,
        idempotencyKey: makeIdempotencyKey(),
      });
    }
    const charge = chargeResponse.data?.data || chargeResponse.data;
    if (!charge?.id) {
      await updateDonationById(donation.id, { status: 'failed', failure_reason: 'Flutterwave V4 charge was not created' });
      return res.status(502).json({ error: 'Payment initialization failed' });
    }
    await updateDonationById(donation.id, {
      flutterwave_transaction_id: String(charge.id),
      status: 'pending',
      metadata: { ...(donation.metadata || {}), flutterwave_charge_id: String(charge.id) },
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
      tx_ref: donation.tx_ref,
      charge_id: String(charge.id),
      status: String(charge.status || 'pending'),
      next_action: charge.next_action || null,
      redirect_url: charge.redirect_url || null,
    });
  } catch (error) {
    const providerStatus = error.response?.status || error.providerStatus || null;
    const providerDetails = error.providerDetails || null;
    console.error('Flutterwave V4 payment initialization failed:', {
      provider_status: providerStatus,
      provider_code: error.providerCode || null,
      provider_error_type: providerDetails?.type || null,
      provider_message: providerDetails?.message || null,
      validation_errors: Array.isArray(providerDetails?.validation_errors) ? providerDetails.validation_errors : [],
      endpoint: error.providerEndpoint || null,
      internal_code: error.code || null,
    });
    return res.status(502).json({
      error: 'Payment initiation failed',
      provider_status: providerStatus,
      provider_code: error.providerCode || null,
    });
  }
});

app.get('/api/payments/verify/:tx_ref', async (req, res) => {
  const txRef = String(req.params.tx_ref || '').trim();
  if (!txRef) return res.status(400).json({ error: 'tx_ref is required' });
  try {
    const donation = await getDonationOr404(txRef, res);
    if (!donation) return;
    const chargeId = String(donation.flutterwave_transaction_id || '').trim();
    if (!chargeId) return res.status(409).json({ verified: false, status: donation.status, error: 'Payment has not been initialized' });
    const response = await retrieveCharge(chargeId);
    const charge = response.data?.data || response.data;
    const successful = await verifyChargeAgainstDonation(donation, charge);
    const attempts = Number(donation.verification_attempts || 0) + 1;
    await updateDonationById(donation.id, {
      verification_attempts: attempts,
      status: successful ? 'successful' : (['failed', 'cancelled'].includes(charge?.status) ? charge.status : 'pending'),
      verified_at: successful ? new Date().toISOString() : null,
      failure_reason: successful ? null : 'Flutterwave V4 verification did not match the expected transaction',
    });
    if (successful && donation.status !== 'successful') {
      await createPaymentEvent({
        donation_id: donation.id,
        event_type: 'charge_verified',
        provider: 'flutterwave',
        provider_transaction_id: String(charge.id),
        status: 'succeeded',
        payload: { id: charge.id, reference: charge.reference, amount: charge.amount, currency: charge.currency, status: charge.status },
      });
    }
    return res.json({ verified: successful, success: successful, status: successful ? 'successful' : String(charge?.status || 'pending'), tx_ref: donation.tx_ref });
  } catch (error) {
    console.error('Flutterwave V4 verification failed:', error.response?.status || error.message);
    return res.status(502).json({ verified: false, error: 'Payment verification failed' });
  }
});

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
    const response = await retrieveCharge(chargeId);
    const charge = response.data?.data || response.data;
    const valid = await verifyChargeAgainstDonation(donation, charge);
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

app.post('/api/payments/create', (req, res) => res.status(410).json({ error: 'Use POST /api/donations followed by POST /api/payments/initialize' }));
app.post('/api/payments/verify', (req, res) => res.status(410).json({ error: 'Use GET /api/payments/verify/:tx_ref' }));
app.get('/api/payments/verify', (req, res) => res.status(410).json({ error: 'Use GET /api/payments/verify/:tx_ref' }));

app.use((err, req, res, next) => {
  if (err?.message === 'Origin not allowed by CORS') return res.status(403).json({ error: 'Origin not allowed' });
  console.error('Unhandled server error:', err?.message || err);
  return res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log('API available at /api');
});
