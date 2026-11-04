const {test,before,after,beforeEach}=require('node:test'),assert=require('node:assert/strict');
process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
const core=require('../communications/core'),axios=require('axios'),express=require('express');
const {router}=require('../communications/routes'),{runWorker}=require('../communications/worker');
const original=axios.defaults.adapter;
let server,base,calls,user,jobs,config,rows;
axios.defaults.adapter=async c=>{
 calls.push(c);let data=[],body=typeof c.data==='string'?JSON.parse(c.data):c.data;
 if(c.url.endsWith('/auth/v1/user'))data=user;
 else if(c.url.includes('/auth/v1/token'))data={access_token:'staff-token'};
 else if(c.url.endsWith('/communication_settings'))data=[{daily_devotional:!!config.daily,daily_time:'00:00',updated_by:'owner'}];
 else if(c.url.endsWith('/devotional_entries'))data=config.reading?[config.reading]:[];
 else if(c.url.endsWith('/communication_jobs')&&c.method==='get')data=config.eventJob?[{id:'job'}]:[];
 else if(c.url.endsWith('/communication_campaigns'))data=c.method==='get'?[]:rows;
 else if(c.url.endsWith('/communication_contacts'))data=[{status:config.contactStatus,categories:['newsletter']}];
 else if(c.url.endsWith('/rpc/crh_communication_claim'))data=jobs.length?[jobs.shift()]:[];
 else if(c.url==='https://api.brevo.com/v3/smtp/email'){
  if(config.timeout)throw Error('Timed out after sending');
  assert.equal(body.to.length,1);data={messageId:'provider-test-reference'};
 }else if(c.url.endsWith('/rpc/crh_communication_preferences'))data=true;
 return {status:200,statusText:'OK',headers:{},config:c,data};
};
before(()=>new Promise(resolve=>{const app=express();app.use(express.json());app.use('/api',router);server=app.listen(0,'127.0.0.1',()=>{base='http://127.0.0.1:'+server.address().port+'/api';resolve()})}));
after(()=>{axios.defaults.adapter=original;return new Promise(r=>server.close(r))});
beforeEach(()=>{calls=[];jobs=[];rows=[];config={contactStatus:'active'};user={id:'staff',email:'staff@example.test',email_confirmed_at:'yes',app_metadata:{role:'admin'}};delete process.env.COMMUNICATIONS_EMAIL_ENABLED;delete process.env.BREVO_API_KEY;delete process.env.BREVO_SENDER_VERIFIED;delete process.env.COMMUNICATIONS_WORKER_SECRET;});
const req=(path,body,auth='staff-token')=>fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
const enable=()=>{process.env.COMMUNICATIONS_EMAIL_ENABLED='true';process.env.BREVO_API_KEY='test-not-a-real-key';process.env.BREVO_SENDER_VERIFIED='true'};
const job=()=>({id:'11111111-1111-4111-8111-111111111111',contact_id:'contact',kind:'welcome',email:'consenting@example.test',subject:'Welcome',text:'Fixture',html:'<p>Fixture</p>'});
test('requires distinct consent, validated email/categories and E.164 phone',()=>{
 const b={name:'Reader',email:'READER@example.test',emailConsent:true,categories:['devotional'],phone:'+234 813 000 0000'};
 assert.equal(core.subscription(b).email,'reader@example.test');assert.equal(core.subscription(b).phone,'+2348130000000');
 for(const change of [{emailConsent:false},{categories:['unknown']},{phone:'08130000000'},{email:'broken'},{name:'A\nInjected'}])assert.throws(()=>core.subscription({...b,...change}));
});
test('templates escape HTML and never execute staff markup',()=>{
 const html=core.emailHtml('<img onerror=alert(1)>','<script>alert(1)</script>',core.ORIGIN+'/subscribe');assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<img onerror='));
 assert.throws(()=>core.campaign({channel:'email',category:'events',subject:'Title',text:'Text',image:'javascript:alert(1)'}));
});
test('SMS counts GSM extension characters and Unicode UTF-16 segments correctly',()=>{
 assert.deepEqual(core.smsSegments('a'.repeat(160)),{encoding:'GSM-7',units:160,segments:1});assert.equal(core.smsSegments('^'.repeat(81)).segments,2);assert.equal(core.smsSegments('🙂'.repeat(36)).segments,2);assert.equal(core.smsSegments('').segments,0);
});
test('untrusted user metadata and ministry editorial flags confer no communication rights',async()=>{
 user.app_metadata={devotional_editor:true};user.user_metadata={communication_role:'admin'};
 assert.equal((await req('/ministry-admin/communications')).status,403);assert.equal(calls.length,1);
});
test('viewer cannot compose or schedule; editor cannot approve',async()=>{
 user.app_metadata={communication_role:'viewer'};assert.equal((await req('/ministry-admin/communications/campaigns',{channel:'email'})).status,403);
 user.app_metadata={communication_role:'editor'};assert.equal((await req('/ministry-admin/communications/campaigns/id/schedule',{})).status,403);
});
test('unconfigured provider does not accept subscribers or claim jobs',async()=>{
 const r=await req('/communications/subscribe',{name:'Reader',email:'reader@example.test',emailConsent:true,categories:['devotional']},null);assert.equal(r.status,503);assert.equal((await runWorker()).state,'setup_required');assert.equal(calls.length,0);
});
test('worker endpoint is closed without a strong secret',async()=>{
 assert.equal((await req('/communications/process',{},null)).status,401);process.env.COMMUNICATIONS_WORKER_SECRET='z'.repeat(40);assert.equal((await req('/communications/process',{},'wrong')).status,401);
 assert.equal((await req('/communications/process',{},'z'.repeat(40))).status,200);
});
test('worker distinguishes acceptance from delivery and sends to one consented address',async()=>{
 enable();jobs=[job()];const result=await runWorker();assert.equal(result.processed,1);
 const write=calls.find(c=>c.url.endsWith('/communication_jobs')&&c.method==='patch');assert.equal(JSON.parse(write.data).status,'accepted');
 const send=calls.find(c=>c.url==='https://api.brevo.com/v3/smtp/email');assert.equal(JSON.parse(send.data).headers.idempotencyKey,job().id);
});
test('timeout becomes needs_review and is never retried',async()=>{
 enable();config.timeout=true;jobs=[job()];await runWorker();assert.equal(calls.filter(c=>c.url==='https://api.brevo.com/v3/smtp/email').length,1);
 assert.equal(JSON.parse(calls.find(c=>c.url.endsWith('/communication_jobs')&&c.method==='patch').data).status,'needs_review');
});
test('unsubscribe between claiming and sending blocks provider call',async()=>{
 enable();config.contactStatus='unsubscribed';jobs=[job()];await runWorker();assert.equal(calls.filter(c=>c.url==='https://api.brevo.com/v3/smtp/email').length,0);
 assert.equal(JSON.parse(calls.find(c=>c.url.endsWith('/communication_jobs')&&c.method==='patch').data).status,'cancelled');
});
test('SMS cannot be approved even with a configured email sender; stale revisions fail closed',async()=>{
 enable();assert.equal((await req('/ministry-admin/communications/campaigns/11111111-1111-4111-8111-111111111111/schedule',{revision:1,approved:true,scheduledAt:'2099-01-01T00:00:00Z'})).status,400);
 const r=await req('/ministry-admin/communications/campaigns/11111111-1111-4111-8111-111111111111/schedule',{revision:1,approved:true,scheduledAt:new Date(Date.now()+60000).toISOString()});assert.equal(r.status,409);
 assert.equal(calls.find(c=>c.method==='patch').params.channel,'eq.email');
});
test('delivery webhooks reject unauthenticated payloads before database access',async()=>{
 delete process.env.COMMUNICATIONS_WEBHOOK_SECRET;assert.equal((await req('/communications/webhooks/brevo',{event:'delivered'},null)).status,401);assert.equal(calls.length,0);
 process.env.COMMUNICATIONS_WEBHOOK_SECRET='w'.repeat(40);assert.equal((await req('/communications/webhooks/brevo',{event:'unknown'},'w'.repeat(40))).status,204);delete process.env.COMMUNICATIONS_WEBHOOK_SECRET;
});

test('daily automation selects only today reviewed released content and retains the editorial revision',async()=>{
 config.daily=true;config.reading={publication_date:require('../devotionals').today(),status:'published',reviewed_by:'reviewer',reviewed_at:new Date().toISOString(),release_at:new Date(Date.now()-60000).toISOString(),revision:7,content:{title:'Approved title',mainReference:'James 1:17',message:'Approved message'}};
 await require('../communications/worker').prepareDaily();
 const post=calls.find(c=>c.url.endsWith('/communication_campaigns')&&c.method==='post');assert.ok(post);const body=JSON.parse(post.data);assert.equal(body.source_revision,7);assert.equal(body.approved_by,'reviewer');assert.match(body.text,/Approved message/);assert.ok(body.expires_at.endsWith('23:59:59+01:00'));
 calls=[];config.reading.status='draft';await require('../communications/worker').prepareDaily();assert.equal(calls.some(c=>c.method==='post'),false);
 calls=[];config.reading.status='published';config.reading.publication_date='2026-11-01';await require('../communications/worker').prepareDaily();assert.equal(calls.some(c=>c.method==='post'),false);
});
test('webhooks reconcile a known message and reject unknown references for later retry',async()=>{
 process.env.COMMUNICATIONS_WEBHOOK_SECRET='h'.repeat(40);config.eventJob=true;
 const body={event:'delivered','message-id':'<provider-id>',email:'reader@example.test',ts_event:Math.floor(Date.now()/1000)};
 assert.equal((await req('/communications/webhooks/brevo',body,'h'.repeat(40))).status,204);
 assert.equal(calls.find(c=>c.url.endsWith('/communication_jobs')).params.provider_id,'eq.provider-id');
 assert.ok(calls.find(c=>c.url.endsWith('/rpc/crh_communication_event')));config.eventJob=false;
 assert.equal((await req('/communications/webhooks/brevo',body,'h'.repeat(40))).status,503);delete process.env.COMMUNICATIONS_WEBHOOK_SECRET;
});
