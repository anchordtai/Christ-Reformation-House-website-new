const axios = require('axios');
const crypto = require('crypto');

const CLIENT_ID = () => String(process.env.FLW_CLIENT_ID || '').trim();
const CLIENT_SECRET = () => String(process.env.FLW_CLIENT_SECRET || '').trim();
const ENCRYPTION_KEY = () => String(process.env.FLW_ENCRYPTION_KEY || '').trim();
const TOKEN_URL = 'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token';
const PRODUCTION_BASE_URL = 'https://f4bexperience.flutterwave.com';
const SANDBOX_BASE_URL = 'https://developersandbox-api.flutterwave.com';

function getApiBaseUrl() {
  const configured = String(process.env.FLW_API_BASE_URL || '').trim().replace(/\/$/, '');
  if (!configured) { const e = new Error('FLW_API_BASE_URL is not configured'); e.code = 'MISSING_API_BASE_URL'; throw e; }
  if (![PRODUCTION_BASE_URL, SANDBOX_BASE_URL].includes(configured)) { const e = new Error('Invalid Flutterwave V4 API base URL'); e.code = 'INVALID_API_BASE_URL'; throw e; }
  return configured;
}

let cachedToken = null;
let tokenExpiresAt = 0;

function requireCredentials() {
  if (!CLIENT_ID() || !CLIENT_SECRET()) { const e = new Error('Flutterwave V4 credentials are not configured'); e.code = 'MISSING_CREDENTIALS'; throw e; }
}

function newId() { return crypto.randomUUID(); }

async function getAccessToken() {
  requireCredentials();
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) return cachedToken;
  const response = await axios.post(TOKEN_URL, new URLSearchParams({ client_id: CLIENT_ID(), client_secret: CLIENT_SECRET(), grant_type: 'client_credentials' }).toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000, validateStatus: () => true,
  });
  const token = response.data?.access_token || response.data?.data?.access_token;
  const expiresIn = Number(response.data?.expires_in || response.data?.data?.expires_in || 600);
  if (response.status < 200 || response.status >= 300 || !token) { const e = new Error('Flutterwave authentication failed'); e.code = 'AUTHENTICATION_FAILED'; e.providerStatus = response.status; throw e; }
  cachedToken = token; tokenExpiresAt = Date.now() + Math.max(60, expiresIn) * 1000;
  return cachedToken;
}

function getEncryptionKeyBytes() {
  const value = ENCRYPTION_KEY();
  if (!value) { const e = new Error('FLW_ENCRYPTION_KEY is not configured'); e.code = 'MISSING_ENCRYPTION_KEY'; throw e; }
  try {
    const key = Buffer.from(value, 'base64');
    if (![16, 24, 32].includes(key.length)) throw new Error('Invalid AES key length');
    return key;
  } catch (e) { const err = new Error('Invalid Flutterwave encryption key'); err.code = 'INVALID_ENCRYPTION_KEY'; throw err; }
}

function generateNonce() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(12);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

function encryptAESGCM(value, keyBytes, nonce) {
  if (value === undefined || value === null || String(value) === '') throw new Error('Cannot encrypt an empty card field');
  if (!nonce || nonce.length !== 12) throw new Error('Flutterwave encryption nonce must be exactly 12 characters');
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBytes, Buffer.from(nonce, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([ciphertext, authTag]).toString('base64');
}

/** Encrypt raw card fields on the trusted backend. Raw values are never persisted or logged. */
function encryptCardPaymentMethod(card) {
  if (!card || typeof card !== 'object') { const e = new Error('Card payment details are required'); e.code = 'INVALID_CARD_DATA'; throw e; }
  const number = String(card.number ?? card.card_number ?? '').replace(/\s/g, '');
  const expiryMonth = String(card.expiry_month ?? card.expiryMonth ?? '').padStart(2, '0');
  const expiryYearRaw = String(card.expiry_year ?? card.expiryYear ?? '');
  const expiryYear = expiryYearRaw.length === 4 ? expiryYearRaw.slice(-2) : expiryYearRaw;
  const cvv = String(card.cvv ?? card.cvc ?? '');
  if (!/^\d{12,19}$/.test(number) || !/^\d{2}$/.test(expiryMonth) || !/^\d{2}$/.test(expiryYear) || !/^\d{3,4}$/.test(cvv)) {
    const e = new Error('Invalid card details'); e.code = 'INVALID_CARD_DATA'; throw e;
  }
  const keyBytes = getEncryptionKeyBytes();
  const nonce = generateNonce();
  return {
    type: 'card',
    card: {
      nonce,
      encrypted_expiry_month: encryptAESGCM(expiryMonth, keyBytes, nonce),
      encrypted_expiry_year: encryptAESGCM(expiryYear, keyBytes, nonce),
      encrypted_card_number: encryptAESGCM(number, keyBytes, nonce),
      encrypted_cvv: encryptAESGCM(cvv, keyBytes, nonce),
    },
  };
}

async function v4Request(method, endpoint, data, idempotencyKey = newId()) {
  const token = await getAccessToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json', 'X-Trace-Id': newId() };
  if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) headers['X-Idempotency-Key'] = idempotencyKey;
  return axios({ method, url: `${getApiBaseUrl()}${endpoint}`, data, headers, timeout: 20000 });
}

async function createDirectCharge({ amount, currency, reference, customer, paymentMethod, redirectUrl, idempotencyKey }) {
  if (!paymentMethod || typeof paymentMethod !== 'object' || Array.isArray(paymentMethod)) { const e = new Error('Flutterwave payment method is required'); e.code = 'INVALID_PAYMENT_METHOD'; throw e; }
  let finalPaymentMethod = paymentMethod;
  if (paymentMethod.type === 'card' && paymentMethod.card && !paymentMethod.card.encrypted_card_number) finalPaymentMethod = encryptCardPaymentMethod(paymentMethod.card);
  return v4Request('POST', '/orchestration/direct-charges', { amount, currency, reference, customer, payment_method: finalPaymentMethod, redirect_url: redirectUrl }, idempotencyKey);
}

async function createCharge({ amount, currency, reference, customerId, paymentMethodId, redirectUrl, meta, idempotencyKey }) {
  if (!customerId || !paymentMethodId) { const e = new Error('customer_id and payment_method_id are required'); e.code = 'MISSING_CHARGE_IDENTIFIERS'; throw e; }
  return v4Request('POST', '/charges', { amount, currency, reference, customer_id: customerId, payment_method_id: paymentMethodId, ...(redirectUrl ? { redirect_url: redirectUrl } : {}), ...(meta ? { meta } : {}) }, idempotencyKey);
}

async function createCustomer({ first, middle, last, email, phone, address, meta, idempotencyKey }) {
  const name = { first: String(first || '').trim(), ...(middle ? { middle: String(middle).trim() } : {}), last: String(last || '').trim() };
  return v4Request('POST', '/customers', { name, email: String(email || '').trim().toLowerCase(), ...(phone ? { phone } : {}), ...(address ? { address } : {}), ...(meta ? { meta } : {}) }, idempotencyKey);
}

async function createPaymentMethod({ type, customerId, card, mobileMoney, bankAccount, ussd, opay, meta, idempotencyKey }) {
  const body = { type, ...(customerId ? { customer_id: customerId } : {}), ...(card ? { card } : {}), ...(mobileMoney ? { mobile_money: mobileMoney } : {}), ...(bankAccount ? { bank_account: bankAccount } : {}), ...(ussd ? { ussd } : {}), ...(opay ? { opay } : {}), ...(meta ? { meta } : {}) };
  return v4Request('POST', '/payment-methods', body, idempotencyKey);
}

async function createVirtualAccount({ reference, customerId, amount, currency, bankCode, expiry, narration, idempotencyKey }) {
  return v4Request('POST', '/virtual-accounts', { reference, customer_id: customerId, amount, currency, account_type: 'dynamic', narration, ...(bankCode ? { bank_code: bankCode } : {}), ...(expiry ? { expiry } : {}) }, idempotencyKey);
}

async function retrieveCharge(chargeId) {
  if (!chargeId) throw new Error('Flutterwave charge ID is required');
  return v4Request('GET', `/charges/${encodeURIComponent(chargeId)}`, undefined);
}

module.exports = { PRODUCTION_BASE_URL, SANDBOX_BASE_URL, getAccessToken, getApiBaseUrl, encryptCardPaymentMethod, createDirectCharge, createCharge, createCustomer, createPaymentMethod, createVirtualAccount, retrieveCharge };
