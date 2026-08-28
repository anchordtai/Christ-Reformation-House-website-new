const axios = require('axios');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.warn('⚠️ WARNING: SUPABASE_URL is missing in environment variables');
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️ WARNING: SUPABASE_SERVICE_ROLE_KEY is missing in environment variables');
}

function getSupabaseHeaders() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase service configuration is missing');
  }

  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
}

function getSupabaseRestUrl(resource) {
  if (!SUPABASE_URL) {
    throw new Error('Supabase URL configuration is missing');
  }

  return `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${resource}`;
}

async function checkSupabaseConnection() {
  const response = await axios.get(getSupabaseRestUrl('donation_types'), {
    headers: getSupabaseHeaders(),
    params: { select: 'id', limit: 1 },
    timeout: 10000,
    validateStatus: () => true,
  });

  if (response.status < 200 || response.status >= 300) {
    const error = new Error(`Supabase REST returned HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return true;
}

module.exports = {
  checkSupabaseConnection,
  getSupabaseHeaders,
  getSupabaseRestUrl,
};
