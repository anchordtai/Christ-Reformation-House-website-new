const {test,before,after,beforeEach}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-server-key';
const axios=require('axios'),express=require('express');
const {router:meetings,settings,signMeeting}=require('../meeting-provider');
const {router:events,validateEvent,validateRegistration}=require('../events');
const {isMeetingHost,isEventEditor}=require('../ministry-admin');
const keypair=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const env={JAAS_APP_ID:'vpaas-magic-cookie-0123456789abcdef',JAAS_KEY_ID:'vpaas-magic-cookie-0123456789abcdef/test',JAAS_PRIVATE_KEY:keypair.privateKey.export({type:'pkcs8',format:'pem'})};
const id='1b498156-9a90-414a-9e56-23c0996c366a';
const input={title:'Test gathering',description:'A controlled test.',starts_at:'2026-12-01T18:00:00+01:00',ends_at:'2026-12-01T19:00:00+01:00',category:'Prayer',location:'Online',published:false,registration_enabled:true};
let base,server,requests,user,rows,conflict,duplicate;
const adapter=axios.defaults.adapter;
axios.defaults.adapter=async config=>{
  requests.push(config);let data;
  if(config.url.endsWith('/auth/v1/user'))data=user;
  else if(config.url.includes('/auth/v1/token'))data={access_token:'verified-token',refresh_token:'rotated-refresh',expires_in:3600};
  else if(config.url.includes('rpc/register_ministry_event')){if(conflict)throw {response:{data:{code:'P0001'}}};data=null}
  else if(config.method==='get')data=rows;
  else if(config.method==='patch')data=conflict?[]:[{id,...JSON.parse(config.data)}];
  else data=duplicate?[]:[{id,...JSON.parse(config.data)}];
  return {status:200,statusText:'OK',headers:{},config,data};
};
before(()=>new Promise(resolve=>{const app=express();app.use(express.json());app.use('/api',events,meetings);server=app.listen(0,'127.0.0.1',()=>{base=`http://127.0.0.1:${server.address().port}/api`;resolve()})}));
after(()=>{axios.defaults.adapter=adapter;for(const key of Object.keys(env))delete process.env[key];return new Promise(resolve=>server.close(resolve))});
beforeEach(()=>{Object.assign(process.env,env);delete process.env.MEETING_HOST_USER_IDS;requests=[];user={id:'staff-user',email_confirmed_at:'2026-01-01',app_metadata:{devotional_editor:true}};rows=[];conflict=false;duplicate=false});
const post=(path,body,token)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
test('missing or invalid JaaS key keeps the public option and never exposes configuration',async()=>{
  delete process.env.JAAS_PRIVATE_KEY;const r=await fetch(base+'/meeting-provider/config');assert.deepEqual(await r.json(),{embedded:false,provider:'public'});
  assert.equal((await post('/meeting-provider/join',{room:'crh-testroom',displayName:'Guest'})).status,503);
  assert.equal(settings({...env,JAAS_KEY_ID:'wrong-app/key'}),null);
});
test('RS256 guest tokens are room-scoped, short lived and cannot escalate through input',()=>{
  const config=settings(env),token=signMeeting({room:'crh-testroom',displayName:'Test guest',user:{app_metadata:{role:'admin'}}},config,1000000);
  const [head,body,signature]=token.split('.'),claims=JSON.parse(Buffer.from(body,'base64url'));
  assert.equal(crypto.verify('RSA-SHA256',Buffer.from(head+'.'+body),keypair.publicKey,Buffer.from(signature,'base64url')),true);
  assert.equal(claims.room,'crh-testroom');assert.equal(claims.context.room.regex,false);assert.equal(claims.context.user.moderator,'false');assert.equal(claims.exp-1000,3600);assert.equal(claims.context.features.recording,false);
  assert.throws(()=>signMeeting({room:'*',displayName:'Guest'},config));
});
test('host authority comes from server verified app metadata or explicit server allowlist',()=>{
  assert.equal(isMeetingHost({id:'other',user_metadata:{meeting_host:true,role:'admin'}}),false);
  assert.equal(isEventEditor({user_metadata:{event_editor:true}}),false);
  assert.throws(()=>signMeeting({room:'crh-testroom',displayName:'False host',host:true,user},settings(env)),/not an authorized/);
  process.env.MEETING_HOST_USER_IDS=user.id;assert.equal(isMeetingHost(user),true);
  const token=signMeeting({room:'crh-testroom',displayName:'Owner',host:true,user},settings(env));
  assert.equal(JSON.parse(Buffer.from(token.split('.')[1],'base64url')).context.user.moderator,'true');
});
test('guest join returns secure embedded credentials without a login or private key',async()=>{
  const r=await post('/meeting-provider/join',{room:'crh-testroom',displayName:'Guest',host:false,moderator:true});const data=await r.json();assert.equal(r.status,200);assert.equal(data.domain,'8x8.vc');assert.equal(data.roomName,env.JAAS_APP_ID+'/crh-testroom');assert.equal(data.privateKey,undefined);assert.equal(requests.length,0);assert.equal(JSON.parse(Buffer.from(data.jwt.split('.')[1],'base64url')).context.user.moderator,'false');
});
test('anonymous or unauthorized hosts cannot obtain moderator credentials',async()=>{
  assert.equal((await post('/meeting-provider/join',{room:'crh-testroom',displayName:'Test',host:true})).status,401);
  assert.equal((await post('/meeting-provider/join',{room:'crh-testroom',displayName:'Test',host:true},'user-token')).status,403);
});
test('host refresh revalidates identity and permission before returning the rotated session',async()=>{
  user.app_metadata.meeting_host=true;
  let r=await post('/meeting-host/refresh',{refreshToken:'old-refresh'});assert.equal(r.status,200);const data=await r.json();assert.equal(data.refreshToken,'rotated-refresh');assert.ok(data.expiresAt>Date.now());
  user.app_metadata={};r=await post('/meeting-host/refresh',{refreshToken:'old-refresh'});assert.equal(r.status,403);assert.equal((await r.json()).token,undefined);
});
test('event validation requires timezone, excludes untrusted fields and rejects unsafe links',()=>{
  assert.equal(validateEvent({...input,updated_by:'attacker'}).updated_by,undefined);
  assert.equal(validateEvent(input).starts_at,'2026-12-01T17:00:00.000Z');
  for(const change of [{starts_at:'2026-12-01T18:00'},{ends_at:'2026-11-30T18:00Z'},{image_path:'https://evil.example/track.jpg'},{image_path:'/assets/img/../secret.jpg'},{meeting_room:'javascript:alert(1)'}])assert.throws(()=>validateEvent({...input,...change}));
});
test('public event reads query only published rows and cannot retrieve staff audit data',async()=>{
  const r=await fetch(base+'/events');assert.equal(r.status,200);assert.equal(requests[0].params.published,'eq.true');assert.equal(requests[0].params.select.includes('updated_by'),false);
  assert.equal((await fetch(base+'/events/not-an-id')).status,404);
});
test('event writes require a verified staff role before touching the event database',async()=>{
  assert.equal((await post('/ministry-admin/events',input)).status,401);assert.equal(requests.length,0);
  user={id:'reader',email_confirmed_at:'yes',app_metadata:{},user_metadata:{event_editor:true}};
  assert.equal((await post('/ministry-admin/events',input,'token')).status,403);assert.equal(requests.some(x=>x.url.includes('rest/v1')),false);
});
test('concurrent event edits are rejected instead of silently overwriting data',async()=>{
  conflict=true;const r=await post('/ministry-admin/events',{...input,id,revision:2},'token');assert.equal(r.status,409);assert.equal(requests.find(x=>x.method==='patch').params.revision,'eq.2');
});
test('retrying event creation reuses the creation key and rejects changed duplicate content',async()=>{
  const creation_key=crypto.randomUUID(),body={...input,creation_key};
  let r=await post('/ministry-admin/events',body,'token');assert.equal(r.status,200);assert.equal(requests.find(x=>x.method==='post').params.on_conflict,'creation_key');
  duplicate=true;rows=[{id,...validateEvent(input),creation_key,revision:1}];r=await post('/ministry-admin/events',body,'token');assert.equal(r.status,200);assert.equal((await r.json()).event.id,id);
  r=await post('/ministry-admin/events',{...body,title:'Changed request'},'token');assert.equal(r.status,409);
});
test('registration requires consent, valid attendance and an available event transaction',async()=>{
  const valid={name:'Test visitor',email:'TEST@example.invalid',attendees:2,consent:true};
  assert.equal(validateRegistration(valid).email,'test@example.invalid');
  for(const change of [{consent:false},{attendees:0},{attendees:1.5},{attendees:11},{email:'invalid'}])assert.throws(()=>validateRegistration({...valid,...change}));
  assert.equal((await post(`/events/${id}/register`,{...valid,consent:false})).status,400);assert.equal(requests.length,0);
  conflict=true;assert.equal((await post(`/events/${id}/register`,valid)).status,409);
  conflict=false;const r=await post(`/events/${id}/register`,valid);assert.equal(r.status,201);assert.match((await r.json()).message,/No automatic confirmation email/);
});
test('private attendee lists require staff authentication and bounded pagination',async()=>{
  assert.equal((await fetch(base+`/ministry-admin/events/${id}/registrations`)).status,401);
  const r=await fetch(base+`/ministry-admin/events/${id}/registrations?offset=-1`,{headers:{Authorization:'Bearer token'}});assert.equal(r.status,400);
});
