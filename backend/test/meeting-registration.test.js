const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),express=require('express'),axios=require('axios');
process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='fixture';
const {router,registration}=require('../meeting-registration');let server,base,calls=[];const original=axios.defaults.adapter;
before(()=>new Promise(resolve=>{axios.defaults.adapter=async c=>{calls.push(c);return {status:200,statusText:'OK',data:[],headers:{},config:c}};const app=express();app.use(express.json());app.use(router);server=app.listen(0,'127.0.0.1',()=>{base='http://127.0.0.1:'+server.address().port;resolve()})}));
after(()=>{axios.defaults.adapter=original;return new Promise(r=>server.close(r))});
const input={room:'crh-example',title:'Prayer gathering',name:'Reader',email:'READER@example.test',consent:true,provider:'public'};
test('meeting registration validates consent and constructs its guest URL on the server',()=>{
 const row=registration({...input,invitation_url:'https://evil.example',moderator:true});assert.equal(row.email,'reader@example.test');assert.equal(row.invitation_url,'https://www.christreformationhouse.org.ng/meetings/room/crh-example?title=Prayer+gathering&provider=public');assert.equal(row.moderator,undefined);
 for(const change of [{consent:false},{room:'../admin'},{email:'bad'},{title:'<script>'}])assert.throws(()=>registration({...input,...change}));
});
test('registration writes deduplicate by room and email without adding a marketing contact',async()=>{
 const result=await fetch(base+'/meetings/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});assert.equal(result.status,202);assert.match((await result.json()).message,/queued/);
 assert.equal(calls[0].params.on_conflict,'room,email');assert.match(calls[0].headers.Prefer,/ignore-duplicates/);assert.equal(calls.some(c=>c.url.includes('communication_contacts')),false);
});
