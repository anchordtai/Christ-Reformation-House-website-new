const axios = require('axios');
const crypto = require('crypto');

const CLIENT_ID = process.env.FLW_CLIENT_ID;
const CLIENT_SECRET = process.env.FLW_CLIENT_SECRET;
const API_BASE_URL = (process.env.FLW_API_BASE_URL || 'https://developersandbox-api.flutterwave.com').replace(/\/$/, '');

let cachedToken = null;
let tokenExpiresAt = 0;

function requireCredentials() {
  if (!CLIENT_ID || !CLIENT_SECRET) throw new Error('Flutterwave V4 credentials are not configured');
}

function newId() {
  return crypto.randomBytes(18).toString('hex');
}

async function getAccessToken() {
  requireCredentials();
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) return cachedToken;

  const response = await axios.post(`${API_BASE_URL}/oauth2/token`, new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'client_credentials',
  }).toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 10000,
  });

  const token = response.data?.data?.access_token || response.data?.access_token;
  const expiresIn = Number(response.data?.data?.expires_in || response.data?.expires_in || 600);
  if (!token) throw new Error('Flutterwave authentication failed');

  cachedToken = token;
  tokenExpiresAt = Date.now() + Math.max(60, expiresIn) * 1000;
  return token;
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

module.exports = { getAccessToken, createDirectCharge, retrieveCharge };
