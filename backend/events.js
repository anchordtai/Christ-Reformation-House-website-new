const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { getSupabaseHeaders, getSupabaseRestUrl } = require('./supabase');
const { fail, ministryUser, bearer, isEventEditor, limiter, wrap } = require('./ministry-admin');
const router = express.Router();
const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');
const fields = 'id,title,description,starts_at,ends_at,location,category,image_path,meeting_room,registration_enabled,published,revision';
async function db(method,resource,params,data,prefer='return=representation') {
  return (await axios({method,url:getSupabaseRestUrl(resource),params,data,headers:{...getSupabaseHeaders(),Prefer:prefer},timeout:10000})).data;
}
function validateEvent(body) {
  const event = {};
  for (const [key,max] of Object.entries({title:160,description:5000,location:200,category:50})) {
    if (typeof body[key] !== 'string' || !body[key].trim() || body[key].length > max) throw fail(400,`Complete ${key} (up to ${max} characters).`);
    event[key] = body[key].trim();
  }
  for (const key of ['starts_at','ends_at']) {
    if (typeof body[key] !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(body[key]) || !Number.isFinite(Date.parse(body[key]))) throw fail(400,'Choose valid start and end times with a timezone.');
    event[key] = new Date(body[key]).toISOString();
  }
  if (event.ends_at <= event.starts_at) throw fail(400,'End time must be after the start time.');
  if (typeof body.published !== 'boolean' || typeof body.registration_enabled !== 'boolean') throw fail(400,'Choose event visibility and registration settings.');
  Object.assign(event,{published:body.published,registration_enabled:body.registration_enabled});
  event.image_path = body.image_path || '';
  if (typeof event.image_path !== 'string' || event.image_path.length > 200 || (event.image_path && (!/^\/assets\/img\/[a-zA-Z0-9 _./-]+\.(jpe?g|png|webp)$/i.test(event.image_path) || event.image_path.includes('..')))) throw fail(400,'Choose an image from the ministry website.');
  event.meeting_room = body.meeting_room || null;
  if (event.meeting_room && !/^[a-z0-9][a-z0-9_-]{5,99}$/i.test(event.meeting_room)) throw fail(400,'Invalid online meeting code.');
  return event;
}
function validateRegistration(body) {
  if (body.consent !== true) throw fail(400,'Please consent to registration data being used for this event.');
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!name || name.length > 100 || /[\x00-\x1f]/.test(name) || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !Number.isInteger(body.attendees) || body.attendees < 1 || body.attendees > 10) throw fail(400,'Enter your name, email and 1–10 attendees.');
  return {name,email,attendees:body.attendees};
}
router.get('/events',wrap(async (req,res) => res.json({events:await db('get','ministry_events',{select:fields,published:'eq.true',order:'starts_at.asc',limit:200})})));
router.get('/events/:id',wrap(async (req,res) => {
  if (!uuid(req.params.id)) throw fail(404,'Event not found.');
  const rows = await db('get','ministry_events',{select:fields,id:`eq.${req.params.id}`,published:'eq.true',limit:1});
  if (!rows[0]) throw fail(404,'This event is not available.');
  res.json({event:rows[0]});
}));
const registerLimit = limiter(15);
router.post('/events/:id/register',wrap(async (req,res) => {
  registerLimit(req);
  if (!uuid(req.params.id)) throw fail(404,'Event not found.');
  const input = validateRegistration(req.body || {});
  try { await db('post','rpc/register_ministry_event',{}, {p_event:req.params.id,p_name:input.name,p_email:input.email,p_attendees:input.attendees}); }
  catch (error) { if (error.response?.data?.code === 'P0001') throw fail(409,'Registration is closed or this event is no longer available.'); throw error; }
  res.status(201).json({message:'Your registration has been received. Keep the event details for your visit. No automatic confirmation email is sent.'});
}));
// Authentication is attached to every staff handler before any database access.
const staff = fn => wrap(async (req,res) => { const user = await ministryUser(bearer(req)); if (!isEventEditor(user)) throw fail(403,'This account cannot manage events.'); await fn(req,res,user); });
// Staff endpoints have a separate namespace from the public event reader.
router.get('/ministry-admin/events',staff(async (req,res) => res.json({events:await db('get','ministry_events',{select:fields,order:'starts_at.desc',limit:200})})));
router.post('/ministry-admin/events',staff(async (req,res,user) => {
  const body = req.body || {};
  const input = validateEvent(body);
  let rows;
  if (body.id) {
    if (!uuid(body.id) || !Number.isInteger(body.revision) || body.revision < 1) throw fail(400,'Reload this event before saving.');
    rows = await db('patch','ministry_events',{id:`eq.${body.id}`,revision:`eq.${body.revision}`},{...input,revision:body.revision+1,updated_at:new Date().toISOString(),updated_by:user.id});
    if (!rows[0]) throw fail(409,'This event changed elsewhere. Reload before saving again.');
  } else {
    if (!uuid(body.creation_key)) throw fail(400,'Reload the event desk before creating an event.');
    rows = await db('post','ministry_events',{on_conflict:'creation_key'}, {...input,id:crypto.randomUUID(),creation_key:body.creation_key,updated_by:user.id},'return=representation,resolution=ignore-duplicates');
    if (!rows[0]) {
      rows = await db('get','ministry_events',{select:'*',creation_key:`eq.${body.creation_key}`,limit:1});
      if (!rows[0] || Object.entries(input).some(([key,value]) => key.endsWith('_at') ? Date.parse(rows[0][key]) !== Date.parse(value) : rows[0][key] !== value)) throw fail(409,'This event was already created. Reload the event list before editing it.');
    }
  }
  res.json({event:rows[0]});
}));
router.get('/ministry-admin/events/:id/registrations',staff(async (req,res) => {
  if (!uuid(req.params.id)) throw fail(400,'Invalid event.');
  const offset = Number(req.query.offset || 0);
  if (!Number.isInteger(offset) || offset < 0 || offset > 100000) throw fail(400,'Invalid page.');
  res.json({registrations:await db('get','ministry_event_registrations',{select:'id,name,email,attendees,created_at',event_id:`eq.${req.params.id}`,order:'created_at.desc',limit:50,offset})});
}));
module.exports = {router,validateEvent,validateRegistration};
