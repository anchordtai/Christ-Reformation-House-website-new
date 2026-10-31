const express = require('express');
const axios = require('axios');
const { getSupabaseHeaders, getSupabaseRestUrl } = require('./supabase');
const { fail, ministryUser, bearer, isEventEditor, limiter, wrap } = require('./ministry-admin');
const router = express.Router();
const columns = 'id,title,description,video_id,state,starts_at,ends_at,revision';
const videoId = /^[A-Za-z0-9_-]{11}$/;
function validateBroadcast(body, now = Date.now()) {
  if (!body || typeof body !== 'object') throw fail(400, 'Complete the broadcast details.');
  const result = {};
  for (const [key,max] of Object.entries({title:160,description:2000})) {
    if (typeof body[key] !== 'string' || body[key].length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(body[key])) throw fail(400, `Check the broadcast ${key}.`);
    result[key] = body[key].trim();
  }
  if (!result.title) throw fail(400, 'Enter a broadcast title.');
  if (!['offline','scheduled','live','replay'].includes(body.state)) throw fail(400, 'Choose a broadcast status.');
  result.state = body.state;
  result.video_id = body.video_id || '';
  if (typeof result.video_id !== 'string' || (result.video_id && !videoId.test(result.video_id)) || (body.state !== 'offline' && !videoId.test(result.video_id))) throw fail(400, 'Enter a valid YouTube video link.');
  for (const key of ['starts_at','ends_at']) {
    const value = body[key];
    if (value && (typeof value !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value)))) throw fail(400, 'Choose valid broadcast times.');
    result[key] = value ? new Date(value).toISOString() : null;
  }
  if (['scheduled','live'].includes(body.state)) {
    const start = Date.parse(result.starts_at), end = Date.parse(result.ends_at);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= now || end <= start || end-start > 12*3600000) throw fail(400, 'Set a future end time after the start, with a duration up to 12 hours.');
    if (body.state === 'live' && start > now) throw fail(400, 'Use Scheduled for a future broadcast.');
  }
  return result;
}
function publicBroadcast(row, now = Date.now()) {
  if (!row || row.state === 'offline') return {state:'offline',title:'Gather around the Word',description:'Our next broadcast will appear here.'};
  let state = row.state;
  if (['live','scheduled'].includes(state) && (!row.ends_at || Date.parse(row.ends_at) <= now)) return {state:'offline',title:'This broadcast has ended',description:'Visit the ministry video library for previous messages.'};
  if (state === 'live' && Date.parse(row.starts_at) > now) state = 'scheduled';
  return {state,title:row.title,description:row.description,video_id:row.video_id,starts_at:row.starts_at,ends_at:row.ends_at};
}
async function db(method, params, data) {
  return (await axios({method,url:getSupabaseRestUrl('ministry_broadcast'),params,data,headers:{...getSupabaseHeaders(),Prefer:'return=representation'},timeout:10000})).data;
}
router.get('/live-broadcast',wrap(async (req,res) => {
  const rows = await db('get',{select:columns,id:'eq.1',limit:1});
  res.set('Cache-Control','public, max-age=15, s-maxage=15');
  res.json({broadcast:publicBroadcast(rows[0])});
}));
const staff = fn => wrap(async(req,res) => {
  const user = await ministryUser(bearer(req));
  if (!isEventEditor(user)) throw fail(403,'This account cannot manage broadcasts.');
  req.ministryActor=user.id;await fn(req,res,user);
});
router.get('/ministry-admin/live-broadcast',staff(async(req,res) => {
  const rows = await db('get',{select:columns,id:'eq.1',limit:1});
  if (!rows[0]) throw fail(503,'The broadcast desk is not configured.');
  res.json({broadcast:rows[0]});
}));
const writes = limiter(40);
router.post('/ministry-admin/live-broadcast',staff(async(req,res,user) => {
  writes(req);
  const body = req.body || {}, input = validateBroadcast(body);
  if (!Number.isInteger(body.revision) || body.revision < 1) throw fail(400,'Reload the broadcast desk before saving.');
  const rows = await db('patch',{id:'eq.1',revision:`eq.${body.revision}`},{...input,revision:body.revision+1,updated_by:user.id,updated_at:new Date().toISOString()});
  if (!rows[0]) throw fail(409,'This broadcast changed elsewhere. Reload before saving.');
  res.json({broadcast:rows[0]});
}));
module.exports = {router,validateBroadcast,publicBroadcast};
