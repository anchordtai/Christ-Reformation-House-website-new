const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { getSupabaseHeaders } = require('./supabase');
const { fail, ministryUser, bearer, isMeetingHost, limiter, wrap } = require('./ministry-admin');
const router = express.Router();
const validRoom = value => /^[a-z0-9][a-z0-9_-]{5,99}$/i.test(value || '');
const { settings, configurationChecks } = require('./jaas-settings');
console.info('JaaS configuration check:', JSON.stringify(configurationChecks()));
function signMeeting({ room, displayName, user, host = false }, config, now = Date.now()) {
  if (!validRoom(room)) throw fail(400,'Invalid meeting code.');
  if (host && (!user || !isMeetingHost(user))) throw fail(403,'This account is not an authorized meeting host.');
  const seconds = Math.floor(now / 1000);
  const payload = { aud:'jitsi', iss:'chat', sub:config.appId, room, nbf:seconds-10, exp:seconds+3600,
    context: { room:{regex:false}, user:{ id:host ? user.id : crypto.randomUUID(), name:displayName, moderator:host ? 'true' : 'false' }, features:{ recording:false, livestreaming:false, transcription:false, 'outbound-call':false, 'sip-outbound-call':false, 'file-upload':false } } };
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const content = `${encode({alg:'RS256',typ:'JWT',kid:config.keyId})}.${encode(payload)}`;
  return `${content}.${crypto.sign('RSA-SHA256',Buffer.from(content),config.privateKey).toString('base64url')}`;
}
router.get('/meeting-provider/config', wrap(async (req,res) => { const ready=!!settings();res.json({embedded:ready,provider:ready?'jaas':'public'}); }));
router.get('/meeting-provider/diagnostics', wrap(async (req,res) => res.json({checks:configurationChecks()})));
const authLimit = limiter(12);
for (const type of ['login','refresh']) router.post(`/meeting-host/${type}`, wrap(async (req,res) => {
  authLimit(req);
  if (!settings()) throw fail(503,'In-website meetings are awaiting the ministry’s meeting connection.');
  const body = req.body || {};
  const login = type === 'login';
  if (login && (typeof body.email !== 'string' || body.email.length > 254 || typeof body.password !== 'string' || body.password.length > 256)) throw fail(400,'Enter your email and password.');
  if (!login && (typeof body.refreshToken !== 'string' || body.refreshToken.length > 8192)) throw fail(400,'Sign in again.');
  let result;
  try { result = await axios.post(`${String(process.env.SUPABASE_URL || '').replace(/\/$/,'')}/auth/v1/token?grant_type=${login ? 'password' : 'refresh_token'}`, login ? {email:body.email,password:body.password} : {refresh_token:body.refreshToken}, {headers:getSupabaseHeaders(),timeout:10000}); }
  catch (error) { if ([400,401,403].includes(error.response?.status)) throw fail(401,'Sign-in failed or session expired.'); throw error; }
  const user = await ministryUser(result.data.access_token);
  if (!isMeetingHost(user)) throw fail(403,'This account is not an authorized meeting host.');
  res.json({ token:result.data.access_token, refreshToken:result.data.refresh_token, expiresAt:Date.now() + (Number(result.data.expires_in) || 3600)*1000 });
}));
const joinLimit = limiter(120);
router.post('/meeting-provider/join', wrap(async (req,res) => {
  joinLimit(req);
  const config = settings();
  if (!config) throw fail(503,'In-website meetings are awaiting the ministry’s meeting connection.');
  const {room,displayName,host} = req.body || {};
  if (!validRoom(room) || typeof displayName !== 'string' || !displayName.trim() || displayName.length > 80 || /[\x00-\x1f]/.test(displayName) || (host !== undefined && typeof host !== 'boolean')) throw fail(400,'Enter a valid meeting code and your name.');
  const user = host ? await ministryUser(bearer(req)) : null;
  const jwt = signMeeting({room,displayName:displayName.trim(),host:host === true,user},config);
  res.json({domain:'8x8.vc',appId:config.appId,roomName:`${config.appId}/${room}`,jwt});
}));
module.exports = { router, settings, signMeeting };
