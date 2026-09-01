const axios = require('axios');
const crypto = require('crypto');

const CLIENT_ID = () => String(process.env.FLW_CLIENT_ID || '').trim();
const CLIENT_SECRET = () => String(process.env.FLW_CLIENT_SECRET || '').trim();
const TOKEN_URL = 'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token';
const PRODUCTION_BASE_URL = 'https://f4bexperience.flutterwave.com';
const SANDBOX_BASE_URL = 'https://developersandbox-api.flutterwave.com';

function getApiBaseUrl() {
  const configured = String(process.env.FLW_API_BASE_URL || '').trim().replace(/\/$/, '');
  if (!configured) {
    const error = new Error('FLW_API_BASE_URL is not configured');
    error.code = 'MISSING_API_BASE_URL';
    throw error;
  }

  if (![PRODUCTION_BASE_URL, SANDBOX_BASE_URL].includes(configured)) {
    const error = new Error('Invalid Flutterwave V4 API base URL');
    error.code = 'INVALID_API_BASE_URL';
    throw error;
  }

  return configured;
}

let cachedToken = null;
let tokenExpiresAt = 0;

function requireCredentials() {
  if (!CLIENT_ID() || !CLIENT_SECRET()) {
    const error = new Error('Flutterwave V4 credentials are not configured');
    error.code = 'MISSING_CREDENTIALS';
    throw error;
  }
}

function newId() {
  return crypto.randomUUID();
}

async function getAccessToken() {
  requireCredentials();
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) return cachedToken;

  const response = await axios.post(TOKEN_URL, new URLSearchParams({
    client_id: CLIENT_ID(),
    client_secret: CLIENT_SECRET(),
    grant_type: 'client_credentials',
  }).toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 10000,
    validateStatus: () => true,
  });

  const token = response.data?.access_token || response.data?.data?.access_token;
  const expiresIn = Number(response.data?.expires_in || response.data?.data?.expires_in || 600);

  if (response.status < 200 || response.status >= 300 || !token) {
    const error = new Error('Flutterwave authentication failed');
    error.code = 'AUTHENTICATION_FAILED';
    error.providerStatus = response.status;
    throw error;
  }

  cachedToken = token;
  tokenExpiresAt = Date.now() + Math.max(60, expiresIn) * 1000;
  return cachedToken;
}

async function v4Request(method, endpoint, data, idempotencyKey = newId()) {
  const apiBaseUrl = getApiBaseUrl();
  const token = await getAccessToken();

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Trace-Id': newId(),
  };

  // Flutterwave requires an idempotency key for mutating requests. Keep it off GETs.
  if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
    headers['X-Idempotency-Key'] = idempotencyKey;
  }

  return axios({
    method,
    url: `${apiBaseUrl}${endpoint}`,
    data,
    headers,
    timeout: 20000,
  });
}

/**
 * Flutterwave V4 Orchestrator flow.
 *
 * Production endpoint:
 *   POST https://f4bexperience.flutterwave.com/orchestration/direct-charges
 *
 * Card details must already be encrypted using Flutterwave's supported client-side
 * encryption flow. Raw card number/CVV/PIN values must never be sent to this API.
 */
async function createDirectCharge({ amount, currency, reference, customer, paymentMethod, redirectUrl, idempotencyKey }) {
  if (!paymentMethod || typeof paymentMethod !== 'object' || Array.isArray(paymentMethod)) {
    const error = new Error('Flutterwave payment method is required');
    error.code = 'INVALID_PAYMENT_METHOD';
    throw error;
  }

  return v4Request('POST', '/orchestration/direct-charges', {
    amount,
    currency,
    reference,
    customer,
    payment_method: paymentMethod,
    redirect_url: redirectUrl,
  }, idempotencyKey);
}

// General V4 charge flow for payment methods that are represented by customer_id + payment_method_id.
async function createCharge({ amount, currency, reference, customerId, paymentMethodId, redirectUrl, meta, idempotencyKey }) {
  if (!customerId || !paymentMethodId) {
    const error = new Error('customer_id and payment_method_id are required');
    error.code = 'MISSING_CHARGE_IDENTIFIERS';
    throw error;
  }

  return v4Request('POST', '/charges', {
    amount,
    currency,
    reference,
    customer_id: customerId,
    payment_method_id: paymentMethodId,
    ...(redirectUrl ? { redirect_url: redirectUrl } : {}),
    ...(meta ? { meta } : {}),
  }, idempotencyKey);
}

async function createCustomer({ first, middle, last, email, phone, address, meta, idempotencyKey }) {
  const name = {
    first: String(first || '').trim(),
    ...(middle ? { middle: String(middle).trim() } : {}),
    last: String(last || '').trim(),
  };

  return v4Request('POST', '/customers', {
    name,
    email: String(email || '').trim().toLowerCase(),
    ...(phone ? { phone } : {}),
    ...(address ? { address } : {}),
    ...(meta ? { meta } : {}),
  }, idempotencyKey);
}

async function createPaymentMethod({ type, customerId, card, mobileMoney, bankAccount, ussd, opay, meta, idempotencyKey }) {
  const body = {
    type,
    ...(customerId ? { customer_id: customerId } : {}),
    ...(card ? { card } : {}),
    ...(mobileMoney ? { mobile_money: mobileMoney } : {}),
    ...(bankAccount ? { bank_account: bankAccount } : {}),
    ...(ussd ? { ussd } : {}),
    ...(opay ? { opay } : {}),
    ...(meta ? { meta } : {}),
  };

  return v4Request('POST', '/payment-methods', body, idempotencyKey);
}

async function createVirtualAccount({ reference, customerId, amount, currency, bankCode, expiry, narration, idempotencyKey }) {
  const body = {
    reference,
    customer_id: customerId,
    amount,
    currency,
    account_type: 'dynamic',
    narration,
    ...(bankCode ? { bank_code: bankCode } : {}),
    ...(expiry ? { expiry } : {}),
  };
  return v4Request('POST', '/virtual-accounts', body, idempotencyKey);
}

async function retrieveCharge(chargeId) {
  if (!chargeId) throw new Error('Flutterwave charge ID is required');
  return v4Request('GET', `/charges/${encodeURIComponent(chargeId)}`, undefined);
}

module.exports = {
  PRODUCTION_BASE_URL,
  SANDBOX_BASE_URL,
  getAccessToken,
  getApiBaseUrl,
  createDirectCharge,
  createCharge,
  createCustomer,
  createPaymentMethod,
  createVirtualAccount,
  retrieveCharge,
};
