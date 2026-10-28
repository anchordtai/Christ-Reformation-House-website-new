const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const axios = require('axios');
const express = require('express');
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-placeholder';
let rows, unavailable, signupPayload;
axios.defaults.adapter = async config => {
  const body = config.data ? JSON.parse(config.data) : undefined;
  let data;
  if (config.url.includes('/auth/v1/user')) {
    const token = config.headers.get('Authorization');
    if (!['Bearer admin-token','Bearer member-token'].includes(token)) throw new axios.AxiosError('Invalid token', 'ERR_BAD_REQUEST', config, null, { status: 401 });
    data = { id: token.includes('admin') ? 'admin-id' : 'member-id', email: 'test@example.com', app_metadata: { role: token.includes('admin') ? 'admin' : 'member' }, user_metadata: { name: 'Test User' } };
  } else if (config.url.includes('/auth/v1/signup')) { signupPayload = body; data = { user: { id: 'new-user' } }; }
  else if (config.url.includes('/auth/v1/token')) data = { access_token: 'member-token', user: { id: 'member-id', email: 'test@example.com', app_metadata: {}, user_metadata: { name: 'Member' } } };
  else {
    if (unavailable) throw new Error('Database disconnected');
    const params = config.params || {};
    const matches = row => (!params.kind || row.kind === params.kind.slice(3)) && (!params.id || row.id === params.id.slice(3));
    if (config.method === 'get') data = rows.filter(matches);
    else if (config.method === 'post') { const row = { id: crypto.randomUUID(), ...body }; rows.push(row); data = [row]; }
    else if (config.method === 'patch') { data = rows.filter(matches); data.forEach(row => Object.assign(row, body)); }
    else if (config.method === 'delete') { data = rows.filter(matches); rows = rows.filter(row => !matches(row)); }
  }
  return { status: 200, statusText: 'OK', headers: {}, config, data: JSON.parse(JSON.stringify(data)) };
};
const app = express(); app.use(require('../security').responseHeaders); app.use(express.json()); app.use('/api', require('../platform'));
let server, base;
before(async () => { server = app.listen(0,'127.0.0.1'); await new Promise(resolve => server.once('listening',resolve)); base = `http://127.0.0.1:${server.address().port}/api`; });
after(async () => new Promise(resolve => server.close(resolve)));
beforeEach(() => { rows = []; unavailable = false; signupPayload = null; });
async function request(path, method = 'GET', body, token) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: response.status, body: await response.json() };
}
const meeting = { title: 'Prayer fellowship', startTime: new Date(Date.now()+60000).toISOString(), endTime: new Date(Date.now()+3600000).toISOString() };
test('public submissions are stored and not exposed through public listing', async () => {
  assert.equal((await request('/contact','POST',{ name:'Donor',email:'donor@example.com',message:'Hello ministry' })).status,201);
  assert.equal(rows[0].kind,'contact'); assert.equal((await request('/admin/messages')).status,401);
  assert.equal((await request('/admin/messages','GET',null,'member-token')).status,403);
  assert.equal((await request('/admin/messages','GET',null,'admin-token')).body[0].message,'Hello ministry');
});
test('anonymous prayer submissions do not retain supplied identifying fields', async () => {
  await request('/prayer-requests','POST',{ request:'Please pray',isAnonymous:true,name:'Do not store',email:'private@example.com' });
  assert.equal(rows[0].payload.name,undefined); assert.equal(rows[0].payload.email,undefined);
});
test('database failure cannot produce a false submission success', async () => {
  unavailable=true; const result=await request('/contact','POST',{ name:'Test',email:'test@example.com',message:'Hello' }); assert.equal(result.status,503); assert.ok(result.body.error.includes('not been confirmed'));
});
test('signup ignores caller-supplied administrator roles', async () => {
  const result=await request('/auth/signup','POST',{ name:'Test',email:'test@example.com',password:'StrongPassword123!',role:'admin',app_metadata:{role:'admin'} });
  assert.equal(result.status,201); assert.equal(signupPayload.app_metadata,undefined); assert.equal(signupPayload.data.role,undefined);
});
test('admin content writes are protected and published content is readable', async () => {
  assert.equal((await request('/admin/content/blog','POST',{title:'Hello'},'member-token')).status,403);
  const result=await request('/admin/content/blog','POST',{title:'Published reflection',content:'Real text'},'admin-token'); assert.equal(result.status,201);
  const item=await request('/blog/'+result.body.id); assert.equal(item.body.title,'Published reflection'); assert.equal(item.body.author,'Test User');
});
test('meeting scheduling requires administrator rights and validates times', async () => {
  assert.equal((await request('/meetings','POST',meeting)).status,401);
  assert.equal((await request('/meetings','POST',meeting,'member-token')).status,403);
  assert.equal((await request('/meetings','POST',{...meeting,endTime:meeting.startTime},'admin-token')).status,400);
});
test('meeting create, list, join, edit and cancellation form a complete flow', async () => {
  const created=await request('/meetings','POST',meeting,'admin-token'); assert.equal(created.status,201); const id=created.body.id;
  assert.equal(created.body.roomName,undefined); assert.equal((await request('/meetings')).body.length,1);
  const join=await request(`/meetings/${id}/join`); assert.equal(join.status,200); assert.match(join.body.roomName,/^crh-[a-f0-9]{36}$/); assert.equal(join.body.domain,'meet.jit.si');
  assert.equal((await request(`/meetings/${id}`,'PATCH',{title:'Updated title'},'admin-token')).body.title,'Updated title');
  await request(`/meetings/${id}/cancel`,'POST',{},'admin-token'); assert.equal((await request(`/meetings/${id}/join`)).status,410);
});
test('email invitations never report delivery without a configured sender', async () => {
  assert.equal((await request('/meetings','POST',{...meeting,inviteEmails:['person@example.com']},'admin-token')).status,409);
  assert.equal((await request('/meetings/unknown/invites','POST',{},'admin-token')).status,503);
});
test('event registration validates the event and persists attendee count', async () => {
  const id=crypto.randomUUID(); rows.push({id,kind:'event',payload:{title:'Gathering'}});
  const result=await request(`/events/${id}/register`,'POST',{name:'Guest',email:'guest@example.com',numberOfAttendees:2}); assert.equal(result.status,201); assert.equal(rows[1].payload.numberOfAttendees,2);
});
test('store calculates order totals from server prices instead of browser prices', async () => {
  const id=crypto.randomUUID(); rows.push({id,kind:'product',payload:{name:'Book',price:25,currency:'USD'}});
  const result=await request('/store/orders','POST',{items:[{id,quantity:2,price:0.01}]},'member-token'); assert.equal(result.status,201); assert.equal(result.body.amount,50); assert.equal(result.body.currency,'USD'); assert.equal(result.body.status,'requested');
});
test('administrator deletion cannot remove a different record kind', async () => {
  const id=crypto.randomUUID(); rows.push({id,kind:'prayer',payload:{request:'Private'}});
  assert.equal((await request(`/admin/content/prayer/${id}`,'DELETE',null,'admin-token')).status,400); assert.equal(rows.length,1);
});
test('Supabase configuration normalization and diagnostics do not expose credentials', () => {
  const {cleanEnv,databaseFailure}=require('../supabase'); assert.equal(cleanEnv(' "https://example.supabase.co" '),'https://example.supabase.co'); assert.equal(databaseFailure({code:'ENOTFOUND'}),'DNS_ERROR'); assert.equal(databaseFailure({code:'ETIMEDOUT'}),'TIMEOUT'); assert.equal(databaseFailure({response:{status:403}}),'AUTH_FAILED');
});

test('private responses are never cached', async () => {
  const response=await fetch(base+'/admin/messages',{headers:{Authorization:'Bearer admin-token'}});assert.equal(response.headers.get('cache-control'),'no-store'); assert.equal(response.headers.get('x-content-type-options'),'nosniff');
});
test('untrusted metadata cannot grant administrator authorization', async () => {
  assert.equal((await request('/admin/content/blog','POST',{title:'Attempt',role:'admin',isAdmin:true},'member-token')).status,403);
});
test('meeting edits cannot overwrite provider room identity or bypass cancellation', async () => {
  const created=await request('/meetings','POST',meeting,'admin-token');const id=created.body.id;const room=rows[0].payload.roomName;
  await request(`/meetings/${id}`,'PATCH',{roomName:'attacker-room',status:'cancelled'},'admin-token');assert.equal(rows[0].payload.roomName,room);assert.equal(rows[0].payload.status,'scheduled');
});
