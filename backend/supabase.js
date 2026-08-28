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

async function checkSupabaseConnection() {
  const response = await axios.get(getSupabaseRestUrl('donation_types'), {
    headers: getSupabaseHeaders(), params: { select: 'id', limit: 1 },
    timeout: 10000, validateStatus: () => true,
  });
  if (response.status < 200 || response.status >= 300) throw new Error(`Supabase REST returned HTTP ${response.status}`);
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
    headers: getSupabaseHeaders(), params: { select: '*', tx_ref: `eq.${txRef}`, limit: 1 }, timeout: 10000,
  });
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

module.exports = { checkSupabaseConnection, getSupabaseHeaders, getSupabaseRestUrl, getActiveDonationType, createDonation, getDonationByTxRef, updateDonationById, createPaymentEvent };
