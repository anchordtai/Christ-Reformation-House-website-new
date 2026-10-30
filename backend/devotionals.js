const express = require('express');
const axios = require('axios');
const { getSupabaseHeaders, getSupabaseRestUrl } = require('./supabase');
const router = express.Router();
const START = '2026-11-01';
const END = '2027-10-31';
const textFields = ['title','monthlyTheme','dailyTheme','messageTitle','mainReference','mainPassage','translation','centralTruth','message','declaration','dailyAction','closingPrayer','memoryReference','memoryVerse','reflectionQuestion','socialSummary','author'];
const listFields = ['supportingReferences','keyLessons','individualPrayers','familyPrayers','churchPrayers','nationsPrayers','ministryPrayers'];
function fail(status, message) { return Object.assign(new Error(message), { status }); }
function validDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s; }
function today(now = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year:'numeric', month:'2-digit', day:'2-digit' }).format(now); }
function dayNumber(date) { return Math.round((Date.parse(date)-Date.parse(START))/86400000)+1; }
function validateContent(input, date) {
  if (!validDate(date) || date < START || date > END) throw fail(400, 'Choose a date in the devotional programme.');
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw fail(400, 'A devotional entry is required.');
  const c = { publicationDate: date, dayNumber: dayNumber(date), programmeStart: START };
  for (const key of textFields) {
    if (typeof input[key] !== 'string' || !input[key].trim() || input[key].length > (key === 'message' ? 16000 : 8000)) throw fail(400, `Complete ${key}.`);
    c[key] = input[key].trim();
  }
  for (const key of listFields) {
    const min = key === 'supportingReferences' ? 2 : key === 'ministryPrayers' ? 7 : 5;
    if (!Array.isArray(input[key]) || input[key].length < min || input[key].length > (key === 'supportingReferences' ? 5 : 12) || input[key].some(s => typeof s !== 'string' || !s.trim() || s.length > 2000)) throw fail(400, `Complete ${key} (${min} or more points).`);
    c[key] = input[key].map(s => s.trim());
  }
  c.applications = {};
  for (const key of ['personal','family','work','relationships','service','spiritualGrowth']) {
    const value = input.applications?.[key];
    if (typeof value !== 'string' || !value.trim() || value.length > 2000) throw fail(400, `Complete the ${key} application.`);
    c.applications[key] = value.trim();
  }
  if (Buffer.byteLength(JSON.stringify(c)) > 80000) throw fail(400, 'Entry is too large.');
  return c;
}
function releaseValues(body, date, user, now = new Date()) {
  const status = body.status || 'draft';
  if (!['draft','scheduled','published'].includes(status)) throw fail(400, 'Invalid editorial status.');
  if (status === 'draft') return { status, release_at:null, reviewed_by:null, reviewed_at:null };
  if (body.reviewAcknowledged !== true) throw fail(400, 'Confirm pastoral review before release.');
  const release = new Date(body.releaseAt);
  if (!body.releaseAt || !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(body.releaseAt) || Number.isNaN(release.getTime())) throw fail(400, 'Provide a release time with a time zone.');
  if (today(release) < date) throw fail(400, 'Release cannot precede the devotional date.');
  if (status === 'published' && (date > today(now) || release > now)) throw fail(400, 'Use scheduled for future readings.');
  if (status === 'scheduled' && release <= now) throw fail(400, 'Scheduled release must be in the future.');
  return { status, release_at:release.toISOString(), reviewed_by:user.id, reviewed_at:now.toISOString() };
}
function visible(row, now = new Date()) { return ['published','scheduled'].includes(row.status) && row.reviewed_by && row.reviewed_at && row.release_at && new Date(row.release_at) <= now && row.publication_date <= today(now); }
function publicEntry(row) { return { ...row.content, publicationDate:row.publication_date, dayNumber:dayNumber(row.publication_date) }; }
async function db(method, params, data) {
  const response = await axios({ method, url:getSupabaseRestUrl('devotional_entries'), params, data, headers:{ ...getSupabaseHeaders(), Prefer:'return=representation' }, timeout:10000 });
  return response.data;
}
async function verifiedUser(token) {
  if (!token || token.length > 8192) throw fail(401, 'Sign in to the devotional desk.');
  const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  if (!url || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw fail(503, 'The devotional desk is not configured.');
  let r;
  try { r = await axios.get(`${url}/auth/v1/user`, { headers:{ ...getSupabaseHeaders(), Authorization:`Bearer ${token}` }, timeout:10000 }); }
  catch (e) { if ([401,403].includes(e.response?.status)) throw fail(401, 'Session expired. Sign in again.'); throw e; }
  const u = r.data;
  if (!u?.id) throw fail(401, 'Sign in again.');
  if (u.app_metadata?.role !== 'admin' && u.app_metadata?.devotional_editor !== true) throw fail(403, 'This account has no devotional editing permission.');
  return u;
}
const wrap = fn => async (req,res) => { try { await fn(req,res); } catch (e) { const status = e.status || (e.response?.status === 409 ? 409 : 503); res.status(status).json({ error:e.status ? e.message : status === 409 ? 'An entry already exists for this date. Open it before editing.' : 'Devotionals are temporarily unavailable. Please try again later.' }); } };
router.use((req,res,next) => { res.set('Cache-Control','no-store'); next(); });
router.get('/devotionals', wrap(async (req,res) => {
  const date = req.query.date;
  const q = req.query.q || '';
  if ((date && !validDate(date)) || typeof q !== 'string' || q.length > 100) throw fail(400, 'Invalid date or search.');
  const rows = await db('get', { select:'publication_date,status,release_at,reviewed_by,reviewed_at,content', status:'in.(published,scheduled)', release_at:`lte.${new Date().toISOString()}`, publication_date: date ? `eq.${date}` : `lte.${today()}`, order:'publication_date.desc', limit:366 });
  const entries = rows.filter(r => visible(r)).map(publicEntry).filter(c => !q || [c.title,c.monthlyTheme,c.mainReference,c.message].join(' ').toLowerCase().includes(q.toLowerCase()));
  res.json({ entries });
}));
// A bounded per-process limit supplements Supabase Auth's own sign-in limits.
const attempts = new Map();
router.post('/devotional-editor/login', wrap(async (req,res) => {
  const now = Date.now();
  for (const [key,v] of attempts) if (v.until < now) attempts.delete(key);
  const key = req.ip;
  const v = attempts.get(key) || { count:0, until:now+600000 };
  if (v.count >= 10 || attempts.size >= 10000) throw fail(429, 'Please wait before trying to sign in again.');
  v.count++; attempts.set(key,v);
  if (typeof req.body.email !== 'string' || req.body.email.length > 254 || typeof req.body.password !== 'string' || req.body.password.length > 256) throw fail(400, 'Enter your email and password.');
  const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  if (!url || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw fail(503, 'The devotional desk is not configured.');
  let result;
  try { result = await axios.post(`${url}/auth/v1/token?grant_type=password`, { email:req.body.email, password:req.body.password }, { headers:getSupabaseHeaders(), timeout:10000 }); }
  catch (e) { if ([400,401,403].includes(e.response?.status)) throw fail(401, 'Sign-in failed. Check your credentials.'); throw e; }
  const user = await verifiedUser(result.data.access_token);
  res.json({ token:result.data.access_token, email:user.email });
}));
// Fixed, ministry-owned callback: never accept a redirect destination from a request.
const PASSWORD_CALLBACK = 'https://www.christreformationhouse.org.ng/admin/devotionals';
const recoveryAttempts = new Map();
function limitRecovery(req) {
  const now = Date.now();
  for (const [key,value] of recoveryAttempts) if (value.until < now) recoveryAttempts.delete(key);
  const keys = [`ip:${req.ip}`, `email:${require('crypto').createHash('sha256').update(String(req.body.email || '').trim().toLowerCase()).digest('hex')}`];
  if (recoveryAttempts.size >= 10000 || keys.some(key => (recoveryAttempts.get(key)?.count || 0) >= 3)) throw fail(429, 'Please wait before requesting another password email.');
  for (const key of keys) { const value = recoveryAttempts.get(key) || { count:0, until:now+3600000 }; value.count++; recoveryAttempts.set(key,value); }
}
router.post('/devotional-editor/password-reset', wrap(async (req,res) => {
  if (typeof req.body.email !== 'string' || req.body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email)) throw fail(400, 'Enter a valid email address.');
  limitRecovery(req);
  const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  if (!url || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw fail(503, 'Password setup is temporarily unavailable.');
  try {
    await axios.post(`${url}/auth/v1/recover`, { email:req.body.email.trim().toLowerCase() }, { headers:getSupabaseHeaders(), params:{ redirect_to:PASSWORD_CALLBACK }, timeout:10000 });
  } catch(e) {
    if (e.response?.status === 429) throw fail(429, 'Please wait before requesting another password email.');
    throw fail(503, 'Unable to request the password email. Please try again later.');
  }
  res.json({ message:'If this email has an account, a password setup link has been requested. Check your inbox and spam folder.' });
}));
router.post('/devotional-editor/password', wrap(async (req,res) => {
  const token = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1];
  await verifiedUser(token);
  if (typeof req.body.password !== 'string' || req.body.password.length < 12 || req.body.password.length > 128) throw fail(400, 'Choose a password between 12 and 128 characters.');
  const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  try {
    await axios.put(`${url}/auth/v1/user`, { password:req.body.password }, { headers:{ ...getSupabaseHeaders(), Authorization:`Bearer ${token}` }, timeout:10000 });
  } catch(e) {
    if ([401,403].includes(e.response?.status)) throw fail(401, 'This link has expired. Request a new password email.');
    if ([400,422].includes(e.response?.status)) throw fail(400, 'Choose a different, stronger password.');
    throw fail(503, 'Password setup is temporarily unavailable. Please try again.');
  }
  res.json({ message:'Your password is saved. Sign in with your email and new password.' });
}));
router.use('/devotional-editor/entries', async (req,res,next) => {
  try { req.editor = await verifiedUser(/^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1]); next(); }
  catch (e) { res.status(e.status || 503).json({ error:e.status ? e.message : 'Unable to verify access. Please try again.' }); }
});
router.get('/devotional-editor/entries', wrap(async (req,res) => {
  res.json({ entries:await db('get', { select:'*', order:'publication_date.asc', limit:366 }) });
}));
router.post('/devotional-editor/entries/:date', wrap(async (req,res) => {
  const date = req.params.date;
  const content = validateContent(req.body.content, date);
  const revision = req.body.expectedRevision;
  if (!Number.isSafeInteger(revision) || revision < 0) throw fail(400, 'A revision number is required.');
  const values = { publication_date:date, content, ...releaseValues(req.body,date,req.editor), revision:revision+1, updated_by:req.editor.id, updated_at:new Date().toISOString() };
  const result = revision === 0 ? await db('post', {}, values) : await db('patch', { publication_date:`eq.${date}`, revision:`eq.${revision}` }, values);
  if (!result?.[0]) throw fail(409, 'Another editor changed this entry. Reload before saving.');
  res.json({ entry:result[0] });
}));
module.exports = { router, validateContent, releaseValues, visible, publicEntry, validDate, today, verifiedUser };
