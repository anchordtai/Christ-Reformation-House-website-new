const axios = require('axios');
const crypto = require('crypto');

const CLIENT_ID = () => String(process.env.FLW_CLIENT_ID || '').trim();
const CLIENT_SECRET = () => String(process.env.FLW_CLIENT_SECRET || '').trim();
const TOKEN_URL = 'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token';
const API_BASE_URL = String(process.env.FLW_API_BASE_URL || 'https://developersandbox-api.flutterwave.com').trim().replace(/\/$/, '');

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
  return crypto.randomBytes(18).toString('hex');
}

async function getAccessToken() {
  requireCredentials();
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) return cachedToken;

  const response = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      client_id: CLIENT_ID(),
      client_secret: CLIENT_SECRET(),
      grant_type: 'client_credentials',
    }).toString(),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
      validateStatus: () => true,
    }
  );

  const token = response.data?.access_token || response.data?.data?.access_token;
  const expiresIn = Number(response.data?.expires_in || response.data?.data?.expires_in || 600);

  if (response.status < 200 || response.status >= 300 || !token) {
    const error = new Error('Flutterwave authentication failed');
    error.code = 'AUTHENTICATION_FAILED';
    error.providerStatus = response.status;
    error.providerCode = response.data?.error || response.data?.error_description || response.data?.data?.error || null;
    throw error;
  }

  cachedToken = token;
  tokenExpiresAt = Date.now() + Math.max(60, expiresIn) * 1000;
  return cachedToken;
}

async function checkFlutterwaveConnection() {
  await getAccessToken();
  return true;
}

async function v4Request(method, endpoint, data, idempotencyKey = newId()) {
  const token = await getAccessToken();
  return axios({
    method,
    url: `${API_BASE_URL}${endpoint}`,
    data,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Trace-Id': newId(),
      'X-Idempotency-Key': idempotencyKey,
    },
    timeout: 20000,
  });
}

async function createDirectCharge({ amount, currency, reference, customer, paymentMethod, redirectUrl, idempotencyKey }) {
  return v4Request('POST', '/orchestration/direct-charges', {
    amount,
    currency,
    reference,
    customer,
    payment_method: paymentMethod,
    redirect_url: redirectUrl,
  }, idempotencyKey);
}

async function retrieveCharge(chargeId) {
  return v4Request('GET', `/charges/${encodeURIComponent(chargeId)}`, undefined, newId());
}

module.exports = { getAccessToken, checkFlutterwaveConnection, createDirectCharge, retrieveCharge };
