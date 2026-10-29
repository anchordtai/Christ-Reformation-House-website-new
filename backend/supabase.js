const axios = require('axios');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

const OPTIONAL_DONATION_COLUMNS = new Set(['failure_reason', 'verification_attempts', 'verified_at', 'webhook_received_at', 'webhook_payload']);

function databaseDiagnostic(error) {
  const data = error?.response?.data;
  const code = typeof data?.code === 'string' && /^[A-Z0-9]{2,12}$/.test(data.code) ? data.code : null;
  const message = typeof data?.message === 'string' ? data.message : '';
  const missing = code === 'PGRST204' ? message.match(/Could not find the '([a-z_]+)' column of 'donations'/) : null;
  return {
    status: Number(error?.response?.status) || null,
    code,
    missing_column: OPTIONAL_DONATION_COLUMNS.has(missing?.[1]) ? missing[1] : null,
    legacy_status_constraint: code === '23514' && message.includes('"donations_status_check"'),
  };
}

async function updateDonationById(id, updates) {
  const values = { ...updates };
  // Retry only explicit, rejected schema operations. Never remove financial
  // identity/status fields or retry a timeout as though it were a schema error.
  for (let attempt = 0; attempt <= OPTIONAL_DONATION_COLUMNS.size + 1; attempt++) {
    try {
      const response = await axios.patch(`${getSupabaseRestUrl('donations')}?id=eq.${encodeURIComponent(id)}`, values, {
        headers: { ...getSupabaseHeaders(), Prefer: 'return=representation' }, timeout: 10000,
      });
      if (!response.data?.[0]) throw new Error('Donation update returned no saved record');
      return response.data[0];
    } catch (error) {
      const diagnostic = databaseDiagnostic(error);
      if (diagnostic.legacy_status_constraint && values.status === 'successful') {
        // Both checked-in schemas accept verified; the API already normalizes it.
        values.status = 'verified';
        console.warn('Donation schema compatibility:', { legacy_status: true });
        continue;
      }
      if (diagnostic.missing_column && Object.hasOwn(values, diagnostic.missing_column)) {
        delete values[diagnostic.missing_column];
        if (!Object.keys(values).length) throw error;
        console.warn('Donation schema compatibility:', { omitted_optional_column: diagnostic.missing_column });
        continue;
      }
      throw error;
    }
  }
  throw new Error('Donation schema reconciliation is required');
}

async function createPaymentEvent(event) {
  const response = await axios.post(getSupabaseRestUrl('payment_events'), event, {
    headers: { ...getSupabaseHeaders(), Prefer: 'return=representation' }, timeout: 10000,
  });
  return response.data?.[0] || null;
}

module.exports = {
  checkSupabaseConnection,
  getSupabaseConfigStatus,
  getSupabaseHeaders,
  getSupabaseRestUrl,
  getActiveDonationType,
  createDonation,
  getDonationByTxRef,
  updateDonationById,
  createPaymentEvent,
  databaseDiagnostic,
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
