const express = require('express');
const axios = require('axios');
const {fail, wrap, limiter, ministryUser, bearer, isEventEditor} = require('./ministry-admin');
const {getSupabaseHeaders,getSupabaseRestUrl} = require('./supabase');
const router = express.Router();
function botConfig() {
  const siteKey=String(process.env.TURNSTILE_SITE_KEY||'').trim();
  const secret=String(process.env.TURNSTILE_SECRET_KEY||'').trim();
  return {siteKey,secret,required:!!(siteKey||secret),ready:!!(siteKey&&secret)};
}
async function verifyBot(req,action) {
  const config=botConfig();
  if(!config.required)return;
  if(!config.ready)throw fail(503,'Form verification is being configured. Please contact the ministry directly.');
  const token=req.body?.verificationToken;
  if(typeof token!=='string'||token.length<1||token.length>2048)throw fail(400,'Complete the form verification and try again.');
  let result;
  try { result=(await axios.post('https://challenges.cloudflare.com/turnstile/v0/siteverify',{secret:config.secret,response:token},{timeout:8000})).data; }
  catch {throw fail(503,'Unable to check form verification. Please try again.');}
  const hostnames=['www.christreformationhouse.org.ng','christreformationhouse.org.ng'];
  if(result?.success!==true||result.action!==action||!hostnames.includes(result.hostname))throw fail(400,'Form verification expired or was unsuccessful. Please try again.');
}
function securityHeaders(req,res,next) {
  res.set('X-Content-Type-Options','nosniff');
  res.set('Referrer-Policy','strict-origin-when-cross-origin');
  next();
}
let recorded=0,windowUntil=0;
function audit(req,res,next) {
  res.on('finish',()=>{
    if(req.method!=='POST')return;
    const route=String(req.route?.path||'');
    if(route==='/ministry-admin/chat/presence')return;
    if(!/^\/(ministry-admin\/|devotional-editor\/(login|password|entries)|devotional-editor\/comments)/.test(route))return;
    const now=Date.now();if(now>windowUntil){recorded=0;windowUntil=now+60000;}if(recorded++>=120)return;
    // Never store bodies, passwords, tokens, chat text, emails or raw IP addresses.
    Promise.resolve().then(()=>axios.post(getSupabaseRestUrl('ministry_security_events'),{actor_id:req.ministryActor||req.editor?.id||null,action:route.slice(0,160),outcome:res.statusCode},{headers:getSupabaseHeaders(),timeout:5000})).catch(()=>console.error('Security event could not be saved'));
  });
  next();
}
router.get('/support/config',wrap(async(req,res)=>{
  const c=botConfig();res.json({verification_required:c.required,verification_site_key:c.ready?c.siteKey:null,chat_poll_seconds:10});
}));
const reads=limiter(60);
router.get('/ministry-admin/security',wrap(async(req,res)=>{
  const user=await ministryUser(bearer(req));if(!isEventEditor(user))throw fail(403,'Staff access required.');reads(req);
  const result=await axios.get(getSupabaseRestUrl('ministry_security_events'),{params:{select:'id,action,outcome,created_at',order:'created_at.desc',limit:100},headers:getSupabaseHeaders(),timeout:10000});
  res.json({events:result.data,bot_verification:botConfig().ready?'configured':botConfig().required?'incomplete':'not_configured',audit_scope:'Staff POST requests (excluding availability heartbeats) and editorial sign-in attempts; process-local rate limits.'});
}));
module.exports={router,verifyBot,botConfig,securityHeaders,audit};
