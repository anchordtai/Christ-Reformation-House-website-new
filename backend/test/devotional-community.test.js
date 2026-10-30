const {test,before,after,beforeEach}=require('node:test');
const assert=require('node:assert/strict');const crypto=require('node:crypto');
process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-service-key';
const axios=require('axios');const express=require('express');const {today}=require('../devotionals');const {router}=require('../devotional-community');
let server,base,visitor,hash,rows,comments,likes,calls,editor,unavailable,stale;
const date=today();const old=axios.defaults.adapter;
axios.defaults.adapter=async config=>{
 calls.push(config);if(unavailable)throw new Error('Secret provider message');
 const table=config.url.split('/').at(-1);const params=config.params||{};const payload=config.data?JSON.parse(config.data):{};let data=[];const headers={};
 if(table==='user')data={id:'editor-id',app_metadata:editor?{devotional_editor:true}:{},user_metadata:{devotional_editor:true}};
 else if(table==='devotional_entries')data=rows;
 else if(table==='devotional_likes'){
  if(config.method==='head')headers['content-range']=`*/${likes.size}`;
  else if(config.method==='post')likes.add(payload.visitor_hash);
  else if(config.method==='delete')likes.delete(params.visitor_hash.slice(3));
  else data=likes.has(params.visitor_hash.slice(3))?[{publication_date:date}]:[];
 }else if(table==='devotional_comments'){
  if(config.method==='post'){if(!comments.some(c=>c.submission_id===payload.submission_id&&c.visitor_hash===payload.visitor_hash))comments.push({id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',created_at:new Date().toISOString(),...payload});}
  else if(config.method==='patch'){
   const c=comments.find(c=>`eq.${c.id}`===params.id&&`eq.${c.status}`===params.status);if(c&&!stale){Object.assign(c,payload);data=[c];}
  }else data=comments.filter(c=>`eq.${c.status}`===params.status).slice(params.offset||0,(params.offset||0)+params.limit).map(c=>Object.fromEntries(params.select.split(',').map(k=>[k,c[k]])));
 }
 return {status:200,statusText:'OK',config,data,headers};
};
before(()=>{const app=express();app.use(express.json());app.use('/api',router);return new Promise(resolve=>{server=app.listen(0,'127.0.0.1',()=>{base=`http://127.0.0.1:${server.address().port}/api`;resolve()})})});
after(()=>{axios.defaults.adapter=old;return new Promise(r=>server.close(r))});
beforeEach(()=>{visitor=crypto.randomBytes(32).toString('hex');hash=crypto.createHash('sha256').update(visitor).digest('hex');rows=[{publication_date:date,status:'published',release_at:new Date(Date.now()-1000).toISOString(),reviewed_by:'editor-id',reviewed_at:new Date().toISOString()}];comments=[];likes=new Set();calls=[];editor=true;unavailable=false;stale=false});
const post=(path,body,token=visitor,auth=false)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{'X-Devotional-Visitor':token}:{}),...(auth?{Authorization:'Bearer editor-token'}:{})},body:JSON.stringify(body)});
const sample=()=>({displayName:'A reader',body:'Thank you for this encouragement.',submissionId:crypto.randomUUID(),consent:true,status:'approved',reviewed_by:'attacker'});
test('draft, missing, unreviewed and future readings reject reads and writes',async()=>{
 for(const update of [{status:'draft'},{reviewed_by:null},{release_at:'2099-01-01T00:00Z'}]){
  rows=[{...rows[0],...update}];let r=await fetch(`${base}/devotionals/${date}/community`);assert.equal(r.status,404);r=await post(`/devotionals/${date}/like`,{liked:true});assert.equal(r.status,404);
 }
 rows=[];assert.equal((await post(`/devotionals/${date}/comments`,sample())).status,404);assert.equal(calls.some(c=>c.url.endsWith('devotional_comments')),false);
});
test('likes use idempotent desired state and can be removed only with the same browser identifier',async()=>{
 for(let i=0;i<2;i++)assert.equal((await post(`/devotionals/${date}/like`,{liked:true})).status,200);
 assert.equal(likes.size,1);assert.ok(likes.has(hash));assert.ok(calls.find(c=>c.method==='post').headers.Prefer.includes('ignore-duplicates'));
 await post(`/devotionals/${date}/like`,{liked:false},crypto.randomBytes(32).toString('hex'));assert.equal(likes.size,1);
 const response=await post(`/devotionals/${date}/like`,{liked:false});assert.deepEqual(await response.json(),{liked:false,likes:0});
});
test('missing/malformed browser identifiers and nonboolean like states rejected',async()=>{
 assert.equal((await post(`/devotionals/${date}/like`,{liked:true},null)).status,400);assert.equal((await post(`/devotionals/${date}/like`,{liked:true},'bad')).status,400);assert.equal((await post(`/devotionals/${date}/like`,{liked:'true'})).status,400);assert.equal(likes.size,0);
});
test('comments always enter moderation, validate consent and retry without duplicate rows',async()=>{
 const body=sample();assert.equal((await post(`/devotionals/${date}/comments`,{...body,consent:false})).status,400);
 assert.equal((await post(`/devotionals/${date}/comments`,{...body,body:'x'.repeat(2001)})).status,400);
 for(let i=0;i<2;i++)assert.equal((await post(`/devotionals/${date}/comments`,body)).status,202);
 assert.equal(comments.length,1);assert.equal(comments[0].status,'pending');assert.equal(comments[0].reviewed_by,undefined);assert.equal(comments[0].visitor_hash,hash);
});
test('public responses exclude pending/rejected comments and all browser identifiers',async()=>{
 comments=['pending','approved','rejected'].map((status,i)=>({id:String(i),status,display_name:'Guest',body:'Reflection',created_at:'2026-01-01',visitor_hash:'PRIVATE',submission_id:'PRIVATE'}));
 const r=await fetch(`${base}/devotionals/${date}/community`,{headers:{'X-Devotional-Visitor':visitor}});const data=await r.json();assert.equal(data.comments.length,1);assert.equal(JSON.stringify(data).includes('PRIVATE'),false);assert.equal(r.headers.get('cache-control'),'no-store');
});
test('moderation requires server-verified editor permission',async()=>{
 assert.equal((await fetch(base+'/devotional-editor/comments')).status,401);
 editor=false;assert.equal((await fetch(base+'/devotional-editor/comments',{headers:{Authorization:'Bearer test'}})).status,403);
});
test('editors approve and withdraw comments with a status condition; conflicts remain visible',async()=>{
 comments=[{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',status:'pending'}];
 let r=await post('/devotional-editor/comments/'+comments[0].id+'/review',{status:'approved',expectedStatus:'pending'},visitor,true);assert.equal(r.status,200);assert.equal(comments[0].reviewed_by,'editor-id');
 r=await post('/devotional-editor/comments/'+comments[0].id+'/review',{status:'rejected',expectedStatus:'approved'},visitor,true);assert.equal(r.status,200);assert.equal(comments[0].status,'rejected');
 stale=true;r=await post('/devotional-editor/comments/'+comments[0].id+'/review',{status:'approved',expectedStatus:'rejected'},visitor,true);assert.equal(r.status,409);
});
test('community errors do not expose provider details and invalid pages are rejected',async()=>{
 unavailable=true;let r=await fetch(`${base}/devotionals/${date}/community`);assert.equal(r.status,503);assert.equal((await r.text()).includes('Secret'),false);
 unavailable=false;r=await fetch(`${base}/devotionals/${date}/community?offset=-1`);assert.equal(r.status,400);
});
