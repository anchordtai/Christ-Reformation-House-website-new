const express = require('express');
const axios = require('axios');
const crypto = require('node:crypto');
const { getSupabaseHeaders, getSupabaseRestUrl, cleanEnv } = require('./supabase');
const router = express.Router();
const contentKinds = { sermons: 'sermon', events: 'event', blog: 'blog', devotionals: 'devotional', 'store/products': 'product' };
const text = (value, max = 1000) => String(value || '').trim().slice(0, max);
const email = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
function fail(status, message) { const error = new Error(message); error.status = status; throw error; }
async function records(method, params, body) {
  try {
    const response = await axios({ method, url: getSupabaseRestUrl('platform_records'), headers: { ...getSupabaseHeaders(), Prefer: 'return=representation' }, params, data: body, timeout: 10000 });
    return response.data || [];
  } catch { fail(503, 'The ministry database is unavailable. Please try later; your request has not been confirmed.'); }
}
const list = kind => records('GET', { kind: `eq.${kind}`, select: '*', order: 'created_at.desc', limit: 200 });
async function find(kind, id) { if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id || '')) return null; return (await records('GET', { kind: `eq.${kind}`, id: `eq.${id}`, limit: 1 }))[0]; }
async function save(kind, payload, owner = null) { return (await records('POST', {}, { kind, payload, owner_id: owner }))[0]; }
const publicRecord = row => ({ ...row.payload, id: row.id });
async function auth(path, method, data, token) {
  const url = getSupabaseRestUrl('unused').replace('/rest/v1/unused', `/auth/v1/${path}`);
  try {
    return (await axios({ method, url, data, headers: { ...getSupabaseHeaders(), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, timeout: 10000 })).data;
  } catch (error) {
    if (error.response?.status === 400 || error.response?.status === 401) fail(401, 'Sign-in details were not accepted, or your email needs confirmation.');
    fail(503, 'Account service is temporarily unavailable. Please try again later.');
  }
}
async function currentUser(req) {
  const token = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1];
  if (!token) fail(401, 'Please sign in to continue.');
  const user = await auth('user', 'GET', undefined, token);
  if (!user?.id || !user.email) fail(401, 'Your session could not be verified. Please sign in again.');
  return { id: user.id, email: user.email, name: user.user_metadata?.name || user.email, role: user.app_metadata?.role === 'admin' ? 'admin' : 'member' };
}
// Middleware needs next() after successful authorization.
async function admin(req, res, next) { try { req.user = await currentUser(req); if (req.user.role !== 'admin') fail(403, 'Administrator access is required.'); next(); } catch (error) { next(error); } }
router.post('/auth/login', wrap(async (req, res) => {
  if (!email(text(req.body?.email, 254)) || (typeof req.body?.password !== 'string' || !req.body.password || req.body.password.length > 200)) fail(400, 'Email and password are required.');
  const data = await auth('token?grant_type=password', 'POST', { email: text(req.body.email, 254), password: req.body.password });
  const user = data.user;
  if (!data.access_token || !user) fail(401, 'Please confirm your email before signing in.');
  res.json({ token: data.access_token, user: { id: user.id, email: user.email, name: user.user_metadata?.name || user.email, role: user.app_metadata?.role === 'admin' ? 'admin' : 'member' } });
}));
router.post('/auth/signup', wrap(async (req, res) => {
  const { name, email: address, password } = req.body || {};
  if (!text(name, 120) || !email(text(address, 254)) || typeof password !== 'string' || password.length < 10 || password.length > 200) fail(400, 'Provide your name, email and a password of at least 10 characters.');
  await auth('signup', 'POST', { email: text(address, 254), password, data: { name: text(name, 120) } });
  res.status(201).json({ message: 'Registration submitted. Check your email for any required confirmation before signing in.' });
}));
router.get('/auth/me', wrap(async (req, res) => res.json(await currentUser(req))));
for (const [route, kind] of Object.entries(contentKinds)) {
  router.get(`/${route}/search`, wrap(async (req, res) => { const query = text(req.query.q, 100).toLowerCase(); res.json((await list(kind)).map(publicRecord).filter(row => [row.title, row.name, row.description, row.content].some(value => String(value || '').toLowerCase().includes(query)))); }));
  router.get(`/${route}`, wrap(async (req, res) => { let rows = (await list(kind)).map(publicRecord); if (kind === 'devotional' && req.query.date) rows = rows.filter(row => row.date === req.query.date); res.json(rows); }));
  router.get(`/${route}/:id`, wrap(async (req, res) => { const row = await find(kind, req.params.id); if (!row) fail(404, 'This item is no longer available.'); res.json(publicRecord(row)); }));
}
router.get('/admin/content/:kind', admin, wrap(async (req, res) => {
  if (!Object.values(contentKinds).includes(req.params.kind)) fail(400, 'Unsupported content type.');
  res.json((await list(req.params.kind)).map(publicRecord));
}));
router.patch('/admin/content/:kind/:id', admin, wrap(async (req, res) => {
  if (!Object.values(contentKinds).includes(req.params.kind)) fail(400, 'Unsupported content type.');
  const existing = await find(req.params.kind, req.params.id); if (!existing) fail(404, 'Content not found.');
  const rows = await records('PATCH', { id: `eq.${existing.id}`, kind: `eq.${req.params.kind}` }, { payload: contentPayload(req.body, req.user) });
  res.json(publicRecord(rows[0]));
}));
router.delete('/admin/content/:kind/:id', admin, wrap(async (req, res) => {
  if (!Object.values(contentKinds).includes(req.params.kind)) fail(400, 'Unsupported content type.');
  const existing = await find(req.params.kind, req.params.id); if (!existing) fail(404, 'Content not found.');
  await records('DELETE', { id: `eq.${existing.id}`, kind: `eq.${req.params.kind}` }); res.json({ success: true });
}));
function contentPayload(body, user) {
  const payload = {};
  for (const key of ['title','name','description','content','excerpt','scripture','scriptureText','prayer','category','speaker','author','time','location','duration','transcript']) payload[key] = text(body?.[key], ['content','transcript'].includes(key) ? 20000 : 3000);
  payload.name = payload.name || payload.title; payload.title = payload.title || payload.name;
  if (!payload.title) fail(400, 'A title or name is required.');
  payload.author = payload.author || user.name; payload.speaker = payload.speaker || user.name; payload.category = payload.category || 'Ministry';
  const date = body?.date || new Date().toISOString().slice(0,10);
  if (!Number.isFinite(+new Date(date))) fail(400, 'A valid date is required.'); payload.date = date;
  for (const key of ['image','videoUrl','audioUrl']) {
    const value = text(body?.[key], 1000);
    if (value && !value.startsWith('/assets/') && !/^https:\/\//i.test(value)) fail(400, 'Use HTTPS media links or site asset paths.'); payload[key] = value;
  }
  payload.image = payload.image || '/assets/img/bible.jpeg';
  payload.price = Number(body?.price || 0); if (!Number.isFinite(payload.price) || payload.price < 0 || payload.price > 100000000) fail(400, 'Invalid price.');
  payload.currency = text(body?.currency || 'NGN',3).toUpperCase(); if (!/^(NGN|USD|GBP|EUR|GHS|ZAR|KES)$/.test(payload.currency)) fail(400, 'Unsupported currency.');
  return payload;
}
router.post('/admin/content/:kind', admin, wrap(async (req, res) => {
  if (!Object.values(contentKinds).includes(req.params.kind)) fail(400, 'Unsupported content type.');
  const payload = contentPayload(req.body, req.user);
  if (req.params.kind === 'product' && (!Number.isFinite(Number(payload.price)) || Number(payload.price) < 0)) fail(400, 'A valid price is required.');
  res.status(201).json(publicRecord(await save(req.params.kind, payload, req.user.id)));
}));
router.post('/contact', wrap(async (req, res) => {
  const body = req.body || {}; if (!text(body.name, 120) || !email(text(body.email, 254)) || !text(body.message, 5000)) fail(400, 'Name, valid email, and message are required.');
  const row = await save('contact', { name: text(body.name, 120), email: text(body.email, 254), subject: text(body.subject, 200), message: text(body.message, 5000) });
  res.status(201).json({ id: row.id, message: 'Your message has been saved for the ministry team.' });
}));
router.post('/prayer-requests', wrap(async (req, res) => {
  const body = req.body || {}; if (!text(body.request, 5000)) fail(400, 'Please enter your prayer request.');
  if (!body.isAnonymous && (!text(body.name, 120) || !email(text(body.email, 254)))) fail(400, 'Name and valid email are required, or choose anonymous.');
  const row = await save('prayer', { request: text(body.request, 5000), requestType: text(body.requestType, 40), isAnonymous: Boolean(body.isAnonymous), ...(body.isAnonymous ? {} : { name: text(body.name, 120), email: text(body.email, 254), phone: text(body.phone, 40) }) });
  res.status(201).json({ id: row.id, message: 'Your prayer request has been saved.' });
}));
router.get('/prayer-requests', admin, wrap(async (req, res) => res.json((await list('prayer')).map(publicRecord))));
router.get('/admin/orders', admin, wrap(async (req, res) => res.json((await list('order')).map(publicRecord))));
router.get('/admin/registrations', admin, wrap(async (req, res) => res.json((await list('registration')).map(publicRecord))));
router.get('/admin/messages', admin, wrap(async (req, res) => res.json((await list('contact')).map(publicRecord))));
router.post('/events/:id/register', wrap(async (req, res) => {
  const event = await find('event', req.params.id); if (!event) fail(404, 'This event is not available.');
  const body = req.body || {}; const count = Number(body.numberOfAttendees || 1);
  if (!text(body.name, 120) || !email(text(body.email, 254)) || !Number.isInteger(count) || count < 1 || count > 20) fail(400, 'Provide your name, email and a valid attendee count (1–20).');
  const row = await save('registration', { eventId: event.id, name: text(body.name, 120), email: text(body.email, 254), phone: text(body.phone, 40), numberOfAttendees: count, specialRequests: text(body.specialRequests, 1000) });
  res.status(201).json({ id: row.id, message: 'Registration saved. Keep this reference; no confirmation email has been sent.' });
}));
router.post('/store/orders', wrap(async (req, res) => {
  const user = await currentUser(req); const items = req.body?.items;
  if (!Array.isArray(items) || !items.length || items.length > 30) fail(400, 'Choose between one and 30 products.');
  const validated = []; let total = 0; let currency;
  for (const item of items) {
    const row = await find('product', item.id); const count = Number(item.quantity);
    if (!row || !Number.isInteger(count) || count < 1 || count > 99 || (!Number.isFinite(Number(row.payload.price)) || Number(row.payload.price) < 0 || Number(row.payload.price) > 100000000)) fail(400, 'An item or quantity is unavailable.');
    const itemCurrency = row.payload.currency || 'NGN'; if (currency && currency !== itemCurrency) fail(400, 'Please order products in one currency at a time.'); currency = itemCurrency;
    const line = Math.round(Number(row.payload.price) * 100) * count; total += line; validated.push({ id: row.id, name: row.payload.name, quantity: count, unitPrice: row.payload.price });
  }
  const row = await save('order', { items: validated, amount: total / 100, currency, status: 'requested', email: user.email }, user.id);
  res.status(201).json({ id: row.id, amount: total / 100, currency, status: 'requested', message: 'Order request saved. Payment and fulfilment are not yet confirmed.' });
}));
function meetingDto(row) { const { roomName, ...data } = publicRecord(row); return data; }
function meetingFields(body) {
  const start = new Date(body.startTime); const end = new Date(body.endTime);
  if (!text(body.title, 160) || !Number.isFinite(+start) || !Number.isFinite(+end) || end <= start || end - start > 24 * 3600000) fail(400, 'Enter a title and valid start/end times, with a duration of at most 24 hours.');
  return { title: text(body.title, 160), description: text(body.description, 3000), startTime: start.toISOString(), endTime: end.toISOString() };
}
router.get('/meetings', wrap(async (req, res) => res.json((await list('meeting')).map(meetingDto))));
router.post('/meetings', admin, wrap(async (req, res) => {
  if (req.body?.inviteEmails?.length) fail(409, 'Automatic email invitations are not configured. Create the meeting without email addresses and share its link.');
  const row = await save('meeting', { ...meetingFields(req.body || {}), status: 'scheduled', roomName: `crh-${crypto.randomBytes(18).toString('hex')}` }, req.user.id);
  res.status(201).json(meetingDto(row));
}));
router.get('/meetings/:id', wrap(async (req, res) => { const row = await find('meeting', req.params.id); if (!row) fail(404, 'Meeting not found.'); res.json(meetingDto(row)); }));
router.patch('/meetings/:id', admin, wrap(async (req, res) => {
  const row = await find('meeting', req.params.id); if (!row) fail(404, 'Meeting not found.');
  const update = req.body || {}; const payload = { ...row.payload, ...meetingFields({ ...row.payload, title: update.title ?? row.payload.title, description: update.description ?? row.payload.description, startTime: update.startTime ?? row.payload.startTime, endTime: update.endTime ?? row.payload.endTime }) }; const updated = await records('PATCH', { id: `eq.${row.id}`, kind: 'eq.meeting' }, { payload }); res.json(meetingDto(updated[0]));
}));
router.post('/meetings/:id/cancel', admin, wrap(async (req, res) => {
  const row = await find('meeting', req.params.id); if (!row) fail(404, 'Meeting not found.');
  await records('PATCH', { id: `eq.${row.id}`, kind: 'eq.meeting' }, { payload: { ...row.payload, status: 'cancelled', cancelReason: text(req.body?.reason, 500) } }); res.json({ success: true });
}));
router.get('/meetings/:id/join', wrap(async (req, res) => {
  const row = await find('meeting', req.params.id); if (!row) fail(404, 'Meeting not found.');
  if (row.payload.status === 'cancelled' || new Date(row.payload.endTime) < new Date()) fail(410, 'This meeting has ended or was cancelled.');
  const domain = cleanEnv(process.env.JITSI_DOMAIN || 'meet.jit.si');
  if (!/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(domain)) fail(503, 'Meeting provider configuration is invalid.');
  res.json({ roomName: row.payload.roomName, subject: row.payload.title, url: `https://${domain}/${row.payload.roomName}`, domain, useEmbed: true, message: 'Your browser will request camera and microphone permission. The meeting host may need to sign in to the video provider.' });
}));
router.post('/meetings/:id/invites', admin, (req, res) => res.status(503).json({ error: 'Automatic email invitations are not configured. Please copy and share the meeting link.' }));
router.get('/live/status', (req, res) => { const url = cleanEnv(process.env.LIVE_STREAM_URL); res.json({ isLive: Boolean(url), url: /^https:\/\//.test(url) ? url : null }); });
router.get('/live/comments/:id', (req, res) => res.status(503).json({ error: 'Live comments require a connected streaming provider.' }));
router.post('/social/post', admin, (req, res) => res.status(503).json({ error: 'Social publishing is not configured. Connect the ministry’s social publishing provider before sending posts.' }));
router.get('/social/scheduled', admin, (req, res) => res.json([]));
router.use((error, req, res, next) => res.status(error.status || 500).json({ error: error.status ? error.message : 'This request could not be completed. Please try again later.' }));
module.exports = router;
