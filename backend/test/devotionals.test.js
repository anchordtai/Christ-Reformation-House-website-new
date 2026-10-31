const { test,before,after,beforeEach }=require('node:test');
const assert=require('node:assert/strict');
process.env.SUPABASE_URL='https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY='server-only-test-key';
const axios=require('axios');
const {router,validateContent,releaseValues,visible,today}=require('../devotionals');
const express=require('express');
const content={applications:{}};
for(const k of ['title','monthlyTheme','dailyTheme','messageTitle','mainReference','mainPassage','translation','centralTruth','message','declaration','dailyAction','closingPrayer','memoryReference','memoryVerse','reflectionQuestion','socialSummary','author'])content[k]='Test '+k;
for(const k of ['supportingReferences','keyLessons','individualPrayers','familyPrayers','churchPrayers','nationsPrayers','ministryPrayers'])content[k]=Array(k==='supportingReferences'?3:k==='ministryPrayers'?7:5).fill('Test point');
for(const k of ['personal','family','work','relationships','service','spiritualGrowth'])content.applications[k]='Test application';
let base,server,requests,user,rows,conflict,unavailable;
const realAdapter=axios.defaults.adapter;
axios.defaults.adapter=async config=>{
  requests.push(config);
  if(unavailable)throw new Error('Do not expose provider detail');
  let data;
  if(config.url.endsWith('/auth/v1/user'))data=user;
  else if(config.url.includes('/auth/v1/token'))data={access_token:'test-token'};
  else if(config.method==='get')data=rows;
  else if(config.method==='patch')data=conflict?[]:[JSON.parse(config.data)];
  else if(config.method==='post')data=[JSON.parse(config.data)];
  return {status:200,statusText:'OK',headers:{},config,data};
};
before(()=>{const app=express();app.use(express.json());app.use('/api',router);return new Promise(resolve=>{server=app.listen(0,'127.0.0.1',()=>{base=`http://127.0.0.1:${server.address().port}/api`;resolve()})})});
after(()=>{axios.defaults.adapter=realAdapter;return new Promise(r=>server.close(r))});
beforeEach(()=>{requests=[];user={id:'editor',email_confirmed_at:'2026-01-01',app_metadata:{devotional_editor:true}};rows=[];conflict=false;unavailable=false});
const post=async(path,body,token='test-token')=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body)});
test('calendar uses Lagos and rejects invalid programme dates',()=>{
 assert.equal(today(new Date('2026-10-31T23:30:00Z')),'2026-11-01');
 assert.throws(()=>validateContent(content,'2026-02-30')); assert.throws(()=>validateContent(content,'2027-11-01'));
 assert.equal(validateContent(content,'2026-11-01').dayNumber,1);assert.equal(validateContent(content,'2027-10-31').dayNumber,365);
});
test('required prayer sections and application fields validated; extra fields removed',()=>{
 assert.throws(()=>validateContent({...content,familyPrayers:[]},'2026-11-01'));
 assert.throws(()=>validateContent({...content,applications:{}},'2026-11-01'));
 assert.equal(validateContent({...content,status:'published',secret:'hidden'},'2026-11-01').secret,undefined);
});
test('review and calendar enforce release timing',()=>{
 const now=new Date('2026-11-01T10:00Z');
 assert.throws(()=>releaseValues({status:'published',releaseAt:now.toISOString()},'2026-11-01',user,now));
 assert.throws(()=>releaseValues({status:'published',releaseAt:'2026-11-02T00:00Z',reviewAcknowledged:true},'2026-11-02',user,now));
 assert.throws(()=>releaseValues({status:'scheduled',releaseAt:'2026-10-31T00:00Z',reviewAcknowledged:true},'2026-11-01',user,now));
 assert.equal(releaseValues({status:'draft',reviewAcknowledged:true},'2026-11-01',user,now).reviewed_by,null);
 assert.equal(releaseValues({status:'scheduled',releaseAt:'2026-11-01T23:00Z',reviewAcknowledged:true},'2026-11-02',user,now).status,'scheduled');
});
test('visibility requires review, elapsed release and reading date',()=>{
 const r={status:'scheduled',reviewed_by:'editor',reviewed_at:'2026-10-30T00:00Z',release_at:'2026-10-31T23:00Z',publication_date:'2026-11-01'};
 assert.equal(!!visible(r,new Date('2026-10-31T22:59Z')),false);
 assert.equal(!!visible(r,new Date('2026-10-31T23:00Z')),true);
 for(const values of [{status:'draft'},{reviewed_by:null},{reviewed_at:null},{publication_date:'2026-11-02'}])assert.equal(!!visible({...r,...values},new Date('2026-11-01T09:00Z')),false);
});
test('unauthenticated editor requests rejected before database access',async()=>{
 const r=await fetch(base+'/devotional-editor/entries'); assert.equal(r.status,401);assert.equal(requests.length,0);assert.equal(r.headers.get('cache-control'),'no-store');
});
test('user-editable metadata cannot grant permission',async()=>{
 user={id:'user',app_metadata:{},user_metadata:{role:'admin',devotional_editor:true}};
 const r=await fetch(base+'/devotional-editor/entries',{headers:{Authorization:'Bearer test'}});assert.equal(r.status,403);assert.equal(requests.length,1);
});
test('fresh provider user permission is checked for every request',async()=>{
 let r=await fetch(base+'/devotional-editor/entries',{headers:{Authorization:'Bearer test'}});assert.equal(r.status,200);
 user.app_metadata={};r=await fetch(base+'/devotional-editor/entries',{headers:{Authorization:'Bearer test'}});assert.equal(r.status,403);
});
test('public endpoint independently filters drafts and future rows and omits editorial metadata',async()=>{
 const date=today();const now=new Date(Date.now()-10000).toISOString();
 const r={publication_date:date,status:'published',release_at:now,reviewed_by:'private-editor',reviewed_at:now,content:{title:'Visible',message:'test'}};
 rows=[r,{...r,status:'draft',content:{title:'PRIVATE'}},{...r,release_at:'2099-01-01T00:00Z',content:{title:'FUTURE'}}];
 const response=await fetch(base+'/devotionals');assert.equal(response.status,200);const data=await response.json();assert.equal(data.entries.length,1);assert.equal(data.entries[0].title,'Visible');assert.equal(JSON.stringify(data).includes('private-editor'),false);
 assert.equal(requests[0].params.status,'in.(published,scheduled)');
});
test('save defaults to draft and requires an optimistic revision',async()=>{
 let r=await post('/devotional-editor/entries/2026-11-01',{content,expectedRevision:0});assert.equal(r.status,200);let entry=(await r.json()).entry;assert.equal(entry.status,'draft');assert.equal(entry.revision,1);assert.equal(entry.reviewed_by,null);
 r=await post('/devotional-editor/entries/2026-11-01',{content});assert.equal(r.status,400);
});
test('concurrent changes fail without unconditional overwrite',async()=>{
 conflict=true;const r=await post('/devotional-editor/entries/2026-11-01',{content,expectedRevision:3});assert.equal(r.status,409);const config=requests.at(-1);assert.equal(config.params.revision,'eq.3');assert.equal(JSON.parse(config.data).revision,4);
});
test('provider outages fail closed without leaking raw error details',async()=>{
 unavailable=true;const r=await fetch(base+'/devotionals');assert.equal(r.status,503);assert.equal((await r.text()).includes('provider detail'),false);
});
test('password email uses a fixed callback and a generic response',async()=>{
 const r=await post('/devotional-editor/password-reset',{email:'editor@example.com',redirectTo:'https://evil.example'});
 assert.equal(r.status,200);assert.match((await r.json()).message,/If this email has an account/);
 const request=requests.at(-1);assert.match(request.url,/\/auth\/v1\/recover$/);assert.equal(request.params.redirect_to,'https://www.christreformationhouse.org.ng/admin/devotionals');assert.deepEqual(JSON.parse(request.data),{email:'editor@example.com'});
});
test('password setup requires a verified editor and a strong password',async()=>{
 let r=await post('/devotional-editor/password',{password:'not-a-real-password'},'');assert.equal(r.status,401);
 r=await post('/devotional-editor/password',{password:'short'});assert.equal(r.status,400);
 user.app_metadata={};r=await post('/devotional-editor/password',{password:'not-a-real-password'});assert.equal(r.status,403);
 assert.equal(requests.some(c=>c.method==='put'),false);
});
test('password setup updates only the token owner and does not return credentials',async()=>{
 const r=await post('/devotional-editor/password',{password:'not-a-real-password',user_id:'another-user'});
 assert.equal(r.status,200);const request=requests.at(-1);assert.equal(request.method,'put');assert.match(request.url,/\/auth\/v1\/user$/);assert.equal(request.headers.Authorization,'Bearer test-token');assert.deepEqual(JSON.parse(request.data),{password:'not-a-real-password'});assert.equal((await r.text()).includes('not-a-real-password'),false);
});


test('unconfirmed editorial accounts cannot read drafts even with a staff role',async()=>{delete user.email_confirmed_at;const r=await fetch(base+'/devotional-editor/entries',{headers:{Authorization:'Bearer test'}});assert.equal(r.status,403);assert.equal(requests.some(c=>c.url.includes('/rest/')),false)});
