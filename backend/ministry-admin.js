const axios = require('axios');
const { getSupabaseHeaders } = require('./supabase');
const fail = (status, message) => Object.assign(new Error(message), { status });
async function ministryUser(token) {
  if (!token || token.length > 8192) throw fail(401, 'Sign in with your ministry staff account.');
  const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  let result;
  try { result = await axios.get(`${url}/auth/v1/user`, { headers: { ...getSupabaseHeaders(), Authorization: `Bearer ${token}` }, timeout: 10000 }); }
  catch (error) { if ([401,403].includes(error.response?.status)) throw fail(401, 'Your session expired. Sign in again.'); throw error; }
  if (!result.data?.id || !result.data?.email_confirmed_at) throw fail(403, 'A confirmed ministry account is required.');
  return result.data;
}
const bearer = req => /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1];
function isEventEditor(user) { return user.app_metadata?.role === 'admin' || user.app_metadata?.devotional_editor === true || user.app_metadata?.event_editor === true; }
function isMeetingHost(user) {
  const ids = String(process.env.MEETING_HOST_USER_IDS || '').split(',').map(x => x.trim()).filter(Boolean);
  return user.app_metadata?.role === 'admin' || user.app_metadata?.meeting_host === true || ids.includes(user.id);
}
function limiter(limit, period = 600000) {
  const attempts = new Map();
  return req => {
    const now = Date.now();
    for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
    const key = req.ip || 'unknown';
    const value = attempts.get(key) || { count: 0, until: now + period };
    if (value.count >= limit || (attempts.size >= 10000 && !attempts.has(key))) throw fail(429, 'Too many requests. Please try again later.');
    value.count++; attempts.set(key, value);
  };
}
const wrap = fn => async (req,res) => {
  res.set('Cache-Control','no-store');
  try { await fn(req,res); }
  catch (error) { res.status(error.status || 503).json({ error: error.status ? error.message : 'This service is temporarily unavailable. Please try again.' }); }
};
module.exports = { fail, ministryUser, bearer, isEventEditor, isMeetingHost, limiter, wrap };
