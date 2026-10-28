const axios = require('axios');

function cleanEnv(value) {
  return String(value || '').trim().replace(/^(["'])(.*)\1$/, '$2').trim();
}
const SUPABASE_URL = cleanEnv(process.env.SUPABASE_URL).replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

function databaseFailure(error) {
  const status = error.providerStatus || error.response?.status;
  if (['ENOTFOUND', 'EAI_AGAIN'].includes(error.code)) return 'DNS_ERROR';
  if (['ECONNABORTED', 'ETIMEDOUT'].includes(error.code)) return 'TIMEOUT';
  if (error.code === 'ERR_INVALID_URL') return 'INVALID_URL';
  if (['ECONNREFUSED', 'ECONNRESET'].includes(error.code)) return 'CONNECTION_ERROR';
  if ([401, 403].includes(status)) return 'AUTH_FAILED';
  if (status === 404 || ['42P01', 'PGRST205'].includes(error.response?.data?.code)) return 'MISSING_TABLE';
  if (error.code === 'MISSING_CREDENTIALS') return 'MISSING_CREDENTIALS';
  return 'QUERY_FAILED';
}


function getSupabaseHeaders() {
  if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase service configuration is missing');
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
}

function getSupabaseRestUrl(resource) {
  if (!SUPABASE_URL) throw new Error('Supabase URL configuration is missing');
  return `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${resource}`;
}

function getSupabaseConfigStatus() {
  return {
    url_configured: Boolean(String(SUPABASE_URL || '').trim()),
    service_role_configured: Boolean(String(SUPABASE_SERVICE_ROLE_KEY || '').trim()),
  };
}

async function checkSupabaseConnection() {
  const config = getSupabaseConfigStatus();
  if (!config.url_configured || !config.service_role_configured) {
    const error = new Error('Supabase credentials are not configured');
    error.code = 'MISSING_CREDENTIALS';
    throw error;
  }

  const response = await axios.get(getSupabaseRestUrl('donation_types'), {
    headers: getSupabaseHeaders(),
    params: { select: 'id', limit: 1 },
    timeout: 10000,
    validateStatus: () => true,
  });

  if (response.status === 404) {
    const error = new Error('donation_types table not found');
    error.code = 'MISSING_TABLE';
    error.providerStatus = 404;
    throw error;
  }

  if (response.status === 401 || response.status === 403) {
    const error = new Error(`Supabase authentication failed with HTTP ${response.status}`);
    error.code = 'AUTH_FAILED';
    error.providerStatus = response.status;
    throw error;
  }

  if (response.status < 200 || response.status >= 300) {
    const error = new Error(`Supabase REST returned HTTP ${response.status}`);
    error.code = 'QUERY_FAILED';
    error.providerStatus = response.status;
    throw error;
  }

  return true;
}

async function getActiveDonationType(code) {
  const response = await axios.get(getSupabaseRestUrl('donation_types'), {
    headers: getSupabaseHeaders(),
    params: { select: 'id,code,name,is_active', code: `eq.${code}`, is_active: 'eq.true', limit: 1 },
    timeout: 10000,
  });
  return response.data?.[0] || null;
}

async function createDonation(donation) {
  const response = await axios.post(getSupabaseRestUrl('donations'), donation, {
    headers: { ...getSupabaseHeaders(), Prefer: 'return=representation' }, timeout: 10000,
  });
  return response.data?.[0] || null;
}

async function getDonationByTxRef(txRef) {
  const response = await axios.get(getSupabaseRestUrl('donations'), {
    headers: getSupabaseHeaders(), params: { select: '*', tx_ref: `eq.${txRef}`, limit: 1 }, timeout: 10000, validateStatus: () => true,
  });
  if (response.status < 200 || response.status >= 300) {
    const error = new Error(`Supabase donation lookup failed with HTTP ${response.status}`);
    error.code = 'SUPABASE_QUERY_FAILED';
    error.providerStatus = response.status;
    throw error;
  }
  return response.data?.[0] || null;
}

async function updateDonationById(id, updates) {
  const response = await axios.patch(`${getSupabaseRestUrl('donations')}?id=eq.${encodeURIComponent(id)}`, updates, {
    headers: { ...getSupabaseHeaders(), Prefer: 'return=representation' }, timeout: 10000,
  });
  return response.data?.[0] || null;
}

async function createPaymentEvent(event) {
  const response = await axios.post(getSupabaseRestUrl('payment_events'), event, {
    headers: { ...getSupabaseHeaders(), Prefer: 'return=representation' }, timeout: 10000,
  });
  return response.data?.[0] || null;
}

module.exports = {
  checkSupabaseConnection,
  databaseFailure,
  cleanEnv,
  getSupabaseConfigStatus,
  getSupabaseHeaders,
  getSupabaseRestUrl,
  getActiveDonationType,
  createDonation,
  getDonationByTxRef,
  updateDonationById,
  createPaymentEvent,
};


// Atomically claim initialization across tabs, workers, and server restarts.
// An uncertain provider response is never retried as a new charge.
async function claimDonationInitialization(donation, key) {
  const response = await axios.patch(getSupabaseRestUrl('donations'), {
    metadata: { ...(donation.metadata || {}), initialization_state: 'started', initialization_key: key },
  }, {
    headers: { ...getSupabaseHeaders(), Prefer: 'return=representation' },
    params: { id: `eq.${donation.id}`, flutterwave_transaction_id: 'is.null', 'metadata->>initialization_state': 'is.null' },
    timeout: 10000,
  });
  return response.data?.[0] || null;
}
module.exports.claimDonationInitialization = claimDonationInitialization;
