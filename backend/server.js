const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();
const {
  checkSupabaseConnection,
  getSupabaseConfigStatus,
  getActiveDonationType,
  createDonation,
  getDonationByTxRef,
  updateDonationById,
  createPaymentEvent,
  claimDonationInitialization,
  databaseDiagnostic,
} = require('./supabase');
const {
  getAccessToken,
  createDirectCharge,
  retrieveCharge,
  encryptCardPaymentMethod,
  prepareAuthorization,
  authorizeCharge,
  createCustomer,
  findCustomerByEmail,
  retrieveCustomer,
  listVirtualAccountsByReference,
  createVirtualAccount,
  listVirtualAccountCharges,
  listNigerianBanks,
} = require('./flutterwave');

const { enabledCurrencies, authorizationType, paymentResponse, matchesDonation, initializationKey } = require('./payment-state');
const { paymentFailure } = require('./payment-failure');
const { configuredMethods, methodsFor, methodCatalog, operationKey, customerId, normalizeTransfer, transferResponse } = require('./payment-methods');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_ORIGIN = String(process.env.FRONTEND_ORIGIN || 'http://localhost:3000').trim().replace(/\/$/, '');
const FLW_WEBHOOK_SECRET_HASH = String(process.env.FLW_WEBHOOK_SECRET_HASH || '').trim();

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
  const credentials = getSupabaseConfigStatus();
  try {
    await checkSupabaseConnection();
    return res.status(200).json({
      status: 'ok',
      database: 'connected',
      credentials_configured: credentials.url_configured && credentials.service_role_configured,
    });
  } catch (error) {
    console.error('Supabase health check failed:', {
      code: error.code || 'UNKNOWN',
      providerStatus: error.providerStatus || null,
      message: error.message,
    });
    return res.status(503).json({
      status: 'error',
      database: 'disconnected',
      stage: error.code === 'MISSING_CREDENTIALS' ? 'configuration' : (error.code === 'MISSING_TABLE' ? 'schema' : (error.code === 'AUTH_FAILED' ? 'authentication' : 'query')),
      credentials_configured: credentials.url_configured && credentials.service_role_configured,
      url_configured: credentials.url_configured,
      service_role_configured: credentials.service_role_configured,
      provider_status: Number.isInteger(error.providerStatus) ? error.providerStatus : null,
    });
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

app.use('/api/payments', (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
app.get('/api/payments/config', (req, res) => res.json({
  provider: 'flutterwave',
  api: 'v4',
  card_encryption_enabled: Boolean(process.env.FLW_ENCRYPTION_KEY),
  currencies: enabledCurrencies(),
  payment_methods: configuredMethods(),
  method_details: methodCatalog(),
  methods_by_currency: Object.fromEntries(enabledCurrencies().map(currency => [currency, methodsFor(currency)])),
}));

let bankCache;
async function paymentBanks() {
  if (bankCache?.expires > Date.now()) return bankCache.banks;
  const result = await listNigerianBanks();
  if (!Array.isArray(result.data?.data)) throw new Error('Invalid bank list');
  const banks = result.data.data.filter(bank => /^\d{3,6}$/.test(bank.code) && typeof bank.name === 'string').map(bank => ({ code: bank.code, name: bank.name.slice(0, 120) })).sort((a, b) => a.name.localeCompare(b.name));
  bankCache = { banks, expires: Date.now() + 300000 }; return banks;
}
app.get('/api/payments/banks', async (req, res) => {
  if (!methodsFor('NGN').includes('ussd')) return res.status(404).json({ error: 'USSD is not enabled' });
  try { return res.json({ banks: await paymentBanks() }); }
  catch { return res.status(503).json({ error: 'The bank list is unavailable. Please try again later.' }); }
});

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
app.use('/api', require('./devotionals').router);
app.get('/api/store/products', (req, res) => res.json(readJSONFile('store-products.json')));

const isValidEmail = (email) => typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidCurrency = (currency) => ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'ZAR', 'KES'].includes(currency);
// Flutterwave V4 references must be 6-42 characters. Keep the reference short and unique.
const makeTxRef = () => `crh-${Date.now().toString(36)}-${crypto.randomBytes(8).toString('hex')}`.slice(0, 42);


function buildFlutterwaveCustomerName(fullName) {
  const parts = String(fullName || 'Donor').trim().split(/\s+/).filter(Boolean);
  const first = parts.shift() || 'Donor';
  const last = parts.join(' ') || first;
  return { first, last };
}

function buildFlutterwavePhone(phone) {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('234')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  // Flutterwave V4 direct charges currently require a 7-10 digit phone number.
  if (digits.length < 7 || digits.length > 10) return null;
  return { country_code: '234', number: digits };
}

async function getDonationOr404(txRef, res) {
  const donation = await getDonationByTxRef(txRef);
  if (!donation) {
    res.status(404).json({ error: 'Donation not found' });
    return null;
  }
  return donation;
}

const SUCCESSFUL_CHARGE_STATUSES = new Set(['succeeded', 'successful', 'completed']);

function normalizeDonationStatus(status) {
  if (status === 'verified') return 'successful';
  return status;
}

function isSuccessfulChargeStatus(status) {
  return SUCCESSFUL_CHARGE_STATUSES.has(String(status || '').toLowerCase());
}

async function verifyChargeAgainstDonation(donation, charge) {
  return Boolean(
    isSuccessfulChargeStatus(charge?.status) &&
    String(charge.reference || '') === String(donation.tx_ref || '') &&
    Number(charge.amount) === Number(donation.amount) &&
    String(charge.currency || '').toUpperCase() === String(donation.currency || '').toUpperCase()
  );
}

function mapProviderError(error, fallbackMessage) {
  if (error?.code === 'SUPABASE_QUERY_FAILED' || error?.message?.includes('Supabase')) {
    return { status: 503, body: { verified: false, error: 'Database is temporarily unavailable. If you were charged, please save your reference and contact us.' } };
  }
  if (error?.code === 'MISSING_CREDENTIALS' || error?.code === 'AUTHENTICATION_FAILED') {
    return { status: 503, body: { verified: false, error: 'Payment provider is not configured on the server.' } };
  }
  if (error?.code === 'FLUTTERWAVE_API_ERROR') {
    return {
      status: 502,
      body: {
        verified: false,
        error: 'Could not confirm payment with Flutterwave right now.',
        provider_status: error.providerStatus || null,
        provider_code: error.providerCode || null,
      },
    };
  }
  return { status: 502, body: { verified: false, error: fallbackMessage || 'Payment verification failed' } };
}

app.post('/api/donations', async (req, res) => {
  const { amount, currency = 'NGN', donationType, name, email, phone, message } = req.body || {};
  const numAmount = typeof amount === 'number' ? amount : Number(amount);
  const currencyCode = String(currency).toUpperCase().trim();
  const donationCode = String(donationType || '').trim().slice(0, 80);
  if (!Number.isFinite(numAmount) || numAmount < 0.01 || numAmount > 100000000 || Math.abs(numAmount * 100 - Math.round(numAmount * 100)) > 0.00001) return res.status(400).json({ error: 'Invalid amount' });
  if (!isValidCurrency(currencyCode) || !enabledCurrencies().includes(currencyCode)) return res.status(400).json({ error: 'Currency not supported' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) return res.status(400).json({ error: 'Full name is required (maximum 120 characters)' });
  if (!donationCode) return res.status(400).json({ error: 'Donation type is required' });
  const checkoutId = req.body?.checkout_id;
  if (checkoutId && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(checkoutId)) return res.status(400).json({ error: 'Invalid checkout identifier' });
  const txRef = checkoutId ? `crh-${checkoutId.toLowerCase()}` : makeTxRef();
  const replyExisting = (donation) => {
    if (Number(donation.amount) !== numAmount || donation.currency !== currencyCode || donation.email !== email.trim().toLowerCase() || donation.donation_type !== donationCode) {
      return res.status(409).json({ error: 'This checkout already belongs to another donation. Check its payment status before starting again.' });
    }
    return res.json({ success: true, tx_ref: donation.tx_ref, status: donation.status });
  };
  try {
    if (checkoutId) {
      const existing = await getDonationByTxRef(txRef);
      if (existing) return replyExisting(existing);
    }
    const type = await getActiveDonationType(donationCode);
    if (!type) return res.status(400).json({ error: 'Invalid or inactive donation type' });
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
    // A simultaneous request may have won the unique tx_ref insert.
    if (checkoutId && error.response?.status === 409) {
      try { const existing = await getDonationByTxRef(txRef); if (existing) return replyExisting(existing); } catch { /* Return a recoverable error below. */ }
    }
    console.error('Donation creation failed:', error.response?.status || error.code || 'unknown');
    return res.status(502).json({ error: 'Unable to create donation' });
  }
});

const initializationRequests = new Set();

app.post('/api/payments/initialize', async (req, res) => {
  const { tx_ref: txRef, paymentMethod } = req.body || {};
  if (typeof txRef !== 'string' || !/^crh-[a-z0-9-]{6,38}$/i.test(txRef)) return res.status(400).json({ error: 'A valid payment reference is required' });
  if (initializationRequests.has(txRef)) return res.status(409).json({ error: 'Payment is being prepared. Please wait before checking again.' });
  initializationRequests.add(txRef);
  let claimedDonationId;
  try {
    const donation = await getDonationOr404(txRef, res);
    if (!donation) return;
    if (normalizeDonationStatus(donation.status) === 'successful') return res.json({ success: true, tx_ref: txRef, status: 'succeeded' });
    if (donation.flutterwave_transaction_id) {
      const response = await retrieveCharge(donation.flutterwave_transaction_id);
      const charge = response.data?.data || response.data;
      if (!matchesDonation(donation, charge)) return res.status(409).json({ error: 'Payment details could not be matched. Please contact the church with your reference.' });
      return res.json(paymentResponse(donation, charge));
    }
    if (['failed', 'cancelled'].includes(donation.status)) return res.json({ tx_ref: txRef, status: donation.status });
    if (donation.metadata?.bank_transfer) return res.json(transferResponse(donation, donation.metadata.bank_transfer));
    if (donation.metadata?.initialization_state) return res.status(409).json({ error: 'A payment request has already been sent. Check its status or contact the church with your reference before paying again.' });
    if (!enabledCurrencies().includes(donation.currency)) return res.status(400).json({ error: 'This currency is not enabled for checkout' });
    const method = paymentMethod?.type;
    if (!methodsFor(donation.currency).includes(method)) return res.status(400).json({ error: 'This payment method is not enabled for the selected currency.' });
    let preparedMethod;
    if (method === 'card') {
      try { preparedMethod = encryptCardPaymentMethod(paymentMethod.card); }
      catch { return res.status(400).json({ error: 'Check your card details. If they are correct, contact the church because card checkout may not be configured.' }); }
    } else if (method === 'ussd') {
      const bank = (await paymentBanks()).find(bank => bank.code === paymentMethod.ussd?.account_bank);
      if (!bank) return res.status(400).json({ error: 'Choose a valid bank from the USSD bank list.' });
      preparedMethod = { type: 'ussd', ussd: { account_bank: bank.code } };
    } else { preparedMethod = { type: method }; }
    const key = initializationKey(txRef);
    const claimed = await claimDonationInitialization(donation, key);
    if (!claimed) return res.status(409).json({ error: 'Payment is already being prepared. Check its status before paying again.' });
    claimedDonationId = donation.id;
    if (method === 'bank_transfer') {
      await updateDonationById(donation.id, { metadata: { ...claimed.metadata, payment_method: method } });
      let customer;
      try {
        const customerResult = await createCustomer({ ...buildFlutterwaveCustomerName(donation.donor_name), email: donation.email, idempotencyKey: operationKey(txRef, 'customer') });
        customer = customerResult.data?.data;
      } catch (error) {
        if (error.code !== 'FLUTTERWAVE_API_ERROR' || error.providerStatus !== 409) throw error;
        customer = await findCustomerByEmail(donation.email);
        if (!customer || customer.email !== donation.email.trim().toLowerCase()) throw error;
      }
      if (!String(customer?.id || '').startsWith('cus_')) throw new Error('Unexpected customer response');
      const result = await createVirtualAccount({ reference: txRef, customerId: customer.id, amount: Number(donation.amount), currency: donation.currency, bankCode: '090567', expiry: 3600, narration: 'CRH Donation', idempotencyKey: operationKey(txRef, 'virtual-account') });
      const transfer = normalizeTransfer(result.data?.data, donation, customer.id);
      await updateDonationById(donation.id, { metadata: { ...claimed.metadata, payment_method: method, bank_transfer: transfer } });
      return res.json(transferResponse(donation, transfer));
    }
    const customerPhone = buildFlutterwavePhone(donation.phone);
    const response = await createDirectCharge({
      amount: Number(donation.amount), currency: donation.currency, reference: txRef,
      customer: { email: donation.email, name: buildFlutterwaveCustomerName(donation.donor_name), ...(customerPhone ? { phone: customerPhone } : {}) },
      paymentMethod: preparedMethod,
      redirectUrl: `${FRONTEND_ORIGIN}/donate/return?tx_ref=${encodeURIComponent(txRef)}`,
      idempotencyKey: key,
    });
    const charge = response.data?.data || response.data;
    if (!charge?.id || !matchesDonation(donation, charge)) throw new Error('Unexpected charge response');
    await updateDonationById(donation.id, { flutterwave_transaction_id: String(charge.id), metadata: { ...claimed.metadata, flutterwave_charge_id: String(charge.id) } });
    // Event recording must not hide a successfully created charge from the donor.
    try { await createPaymentEvent({ donation_id: donation.id, event_type: 'charge_created', provider: 'flutterwave', provider_transaction_id: String(charge.id), status: charge.status || 'pending', payload: { id: charge.id, reference: charge.reference } }); }
    catch { console.error('Payment event recording unavailable'); }
    return res.json(paymentResponse(donation, charge));
  } catch (error) {
    if (claimedDonationId && error.code === 'FLUTTERWAVE_API_ERROR' && [400, 422].includes(error.providerStatus)) {
      try {
        await updateDonationById(claimedDonationId, { status: 'failed', failure_reason: 'Payment provider rejected initialization' });
        return res.json({ tx_ref: txRef, status: 'failed' });
      } catch { /* Keep uncertain outcomes protected from a second charge. */ }
    }
    console.error('Payment initialization unavailable:', {
      code: error.code || 'unknown', status: error.providerStatus || null,
      endpoint: ['/customers', '/virtual-accounts', '/orchestration/direct-charges'].includes(error.providerEndpoint) ? error.providerEndpoint : null,
      provider_code: /^[A-Za-z0-9_-]{1,20}$/.test(String(error.providerCode || '')) ? String(error.providerCode) : null,
    });
    return res.status(502).json({ error: 'We could not confirm that checkout started. Keep your reference and check payment status before paying again.' });
  } finally { initializationRequests.delete(txRef); }
});

app.post('/api/payments/authorize', async (req, res) => {
  const { tx_ref: txRef, authorization } = req.body || {};
  if (typeof txRef !== 'string' || txRef.length > 42) return res.status(400).json({ error: 'Payment reference is required' });
  try {
    const donation = await getDonationOr404(txRef, res);
    if (!donation) return;
    if (!donation.flutterwave_transaction_id) return res.status(409).json({ error: 'Payment has not been initialized' });
    const current = await retrieveCharge(donation.flutterwave_transaction_id);
    const charge = current.data?.data || current.data;
    if (!matchesDonation(donation, charge)) return res.status(409).json({ error: 'Payment details could not be matched' });
    const expected = authorizationType(charge.next_action);
    if (!expected) return res.json(paymentResponse(donation, charge));
    if (authorization?.type !== expected) return res.status(409).json({ error: 'The bank requested a different authorization step. Resume checkout to continue.' });
    let prepared;
    try { prepared = prepareAuthorization(authorization); }
    catch { return res.status(400).json({ error: 'Check the authorization details and try again' }); }
    const response = await authorizeCharge(charge.id, prepared);
    const updated = response.data?.data || response.data;
    if (String(updated.id) !== String(charge.id) || !matchesDonation(donation, updated)) throw new Error('Unexpected authorization response');
    return res.json(paymentResponse(donation, updated));
  } catch (error) {
    // Never log authorization values or provider payloads.
    console.error('Payment authorization unavailable:', error.code || 'unknown');
    return res.status(502).json({ error: 'Authorization could not be confirmed. Resume this payment or check its status before paying again.' });
  }
});

app.get('/api/payments/verify/:tx_ref', async (req, res) => {
  const txRef = String(req.params.tx_ref || '').trim();
  if (!/^crh-[a-z0-9-]{6,38}$/i.test(txRef)) return res.status(400).json({ error: 'A valid payment reference is required' });
  try {
    let donation;
    try {
      donation = await getDonationByTxRef(txRef);
    } catch (error) {
      console.error('Donation lookup failed during verification:', error.message);
      const mapped = mapProviderError(error, 'Could not load donation record for verification');
      return res.status(mapped.status).json(mapped.body);
    }
    if (!donation) return res.status(404).json({ verified: false, error: 'Donation not found' });

    const currentStatus = normalizeDonationStatus(donation.status);
    if (currentStatus === 'successful') {
      return res.json({ verified: true, success: true, status: 'successful', tx_ref: donation.tx_ref });
    }

    let chargeId = String(donation.flutterwave_transaction_id || '').trim();
    let transfer = donation.metadata?.bank_transfer;
    // Read-only provider recovery. Never clear the claim or create an account here.
    // Legacy claims did not record the method, so look up an exact reference only.
    if (!chargeId && !transfer && donation.currency === 'NGN' && donation.metadata?.initialization_state && (!donation.metadata.payment_method || donation.metadata.payment_method === 'bank_transfer')) {
      const result = await listVirtualAccountsByReference(txRef);
      if (!Array.isArray(result.data?.data)) throw new Error('Invalid account recovery response');
      const accounts = result.data.data.filter(account => account.reference === txRef);
      if (accounts.length > 1) return res.status(409).json({ verified: false, error: 'Multiple transfer accounts need reconciliation. Contact the ministry with your reference.' });
      if (accounts.length === 1) {
        const account = accounts[0];
        const customer = (await retrieveCustomer(customerId(account))).data?.data;
        if (String(customer?.email || '').trim().toLowerCase() !== donation.email.trim().toLowerCase() || String(customer?.id || '') !== customerId(account)) return res.status(409).json({ verified: false, error: 'Transfer account ownership could not be confirmed. Contact the ministry with your reference.' });
        transfer = normalizeTransfer(account, donation, customer.id, true);
        await updateDonationById(donation.id, { metadata: { ...donation.metadata, payment_method: 'bank_transfer', bank_transfer: transfer } });
      }
    }
    if (!chargeId && transfer) {
      const result = await listVirtualAccountCharges(transfer.virtual_account_id);
      const records = result.data?.data;
      if (!Array.isArray(records)) throw new Error('Invalid transfer status response');
      const matches = records.filter(charge => matchesDonation(donation, charge) && customerId(charge) === transfer.customer_id);
      if (!matches.length) return res.json({ verified: false, status: 'pending', tx_ref: txRef, transfer_expired: Date.parse(transfer.expires_at) <= Date.now(), error: 'No matching transfer has been confirmed yet. Do not transfer again while the ministry checks an existing payment.' });
      if (matches.length !== 1) return res.status(409).json({ verified: false, error: 'Multiple transfers need reconciliation. Contact the ministry with your reference.' });
      chargeId = String(matches[0].id || '');
      if (!chargeId) throw new Error('Missing transfer charge ID');
      await updateDonationById(donation.id, { flutterwave_transaction_id: chargeId });
    }
    if (!chargeId && ['failed', 'cancelled'].includes(donation.status)) return res.json({ verified: false, status: donation.status, tx_ref: txRef });
    if (!chargeId) {
      return res.status(409).json({
        verified: false,
        status: donation.status,
        error: 'Payment has not been initialized yet. If you just paid, wait a moment and refresh.',
      });
    }

    const response = await retrieveCharge(chargeId);
    const charge = response.data?.data || response.data;
    if (transfer && customerId(charge) !== transfer.customer_id) return res.status(409).json({ verified: false, error: 'Transfer details need reconciliation. Contact the ministry with your reference.' });
    const successful = await verifyChargeAgainstDonation(donation, charge);
    const chargeStatus = String(charge?.status || 'pending');
    // A failed charge is not an amount/reference mismatch. Only expose diagnostics
    // once the charge has been matched to this donation.
    const failure = matchesDonation(donation, charge) ? paymentFailure(charge) : null;
    const attempts = Number(donation.verification_attempts || 0) + 1;

    try {
      await updateDonationById(donation.id, {
        verification_attempts: attempts,
        status: successful ? 'successful' : (['failed', 'cancelled'].includes(chargeStatus) ? chargeStatus : 'pending'),
        verified_at: successful ? new Date().toISOString() : null,
        failure_reason: successful ? null : (failure ? `${failure.category}${failure.support_code ? ': ' + failure.support_code : ''}` : (isSuccessfulChargeStatus(chargeStatus) ? 'Flutterwave verification did not match the expected transaction' : null)),
      });
    } catch (dbError) {
      console.error('Donation update failed during verification:', databaseDiagnostic(dbError));
      if (successful) {
        return res.json({
          verified: true,
          success: true,
          status: 'successful',
          tx_ref: donation.tx_ref,
          charge_status: chargeStatus,
          warning: 'Payment confirmed with Flutterwave, but the database could not be updated.',
        });
      }
    }

    let auditWarning;
    if (successful && currentStatus !== 'successful') {
      try {
        await createPaymentEvent({
          donation_id: donation.id, event_type: 'charge_verified', provider: 'flutterwave',
          provider_transaction_id: String(charge.id), status: chargeStatus,
          payload: { id: charge.id, reference: charge.reference, amount: charge.amount, currency: charge.currency, status: charge.status },
        });
      } catch (error) {
        console.error('Verified donation audit record unavailable:', databaseDiagnostic(error));
        auditWarning = 'Your payment is confirmed and saved. A ministry audit record still needs reconciliation.';
      }
    }

    if (!successful && isSuccessfulChargeStatus(chargeStatus)) {
      return res.json({
        verified: false,
        success: false,
        status: chargeStatus,
        tx_ref: donation.tx_ref,
        charge_status: chargeStatus,
        error: 'Payment was received, but the amount or reference did not match our records. Please contact us with your reference.',
      });
    }

    return res.json({
      verified: successful,
      success: successful,
      status: successful ? 'successful' : chargeStatus,
      tx_ref: donation.tx_ref,
      charge_status: chargeStatus,
      ...(auditWarning ? { warning: auditWarning } : {}),
      ...(failure ? { failure } : {}),
      ...(successful ? {} : { error: chargeStatus === 'pending' ? 'Payment is still processing. Please wait and try again.' : 'Payment verification did not succeed.' }),
    });
  } catch (error) {
    console.error('Flutterwave V4 verification failed:', {
      message: error.message,
      code: error.code || null,
      provider_status: error.providerStatus || error.response?.status || null,
    });
    const mapped = mapProviderError(error, 'Payment verification failed');
    return res.status(mapped.status).json({ ...mapped.body, tx_ref: txRef });
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
    if (!matchesDonation(donation, charge) || (donation.metadata?.bank_transfer && customerId(charge) !== donation.metadata.bank_transfer.customer_id)) return res.status(200).json({ received: true });
    const valid = await verifyChargeAgainstDonation(donation, charge);
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
    // An unavailable audit table must not prevent saving a verified donation.
    // A later failure still returns 500 so Flutterwave can retry event delivery.
    await createPaymentEvent({
      donation_id: donation.id,
      event_type: String(event.type || 'charge.completed').slice(0, 100),
      provider: 'flutterwave', provider_transaction_id: chargeId,
      status: String(charge?.status || 'received').slice(0, 50),
      payload: { id: data.id, reference: data.reference, status: data.status, amount: data.amount, currency: data.currency },
    });
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Flutterwave webhook processing failed:', databaseDiagnostic(error));
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

if (require.main === module) app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log('API available at /api');
});


module.exports = app;
