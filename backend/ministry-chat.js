const express=require('express'),axios=require('axios'),crypto=require('crypto');
const {getSupabaseHeaders,getSupabaseRestUrl}=require('./supabase');
const {fail,wrap,limiter,ministryUser,bearer,isEventEditor}=require('./ministry-admin');
const {verifyBot}=require('./site-security');
const router=express.Router();
const uuid=v=>typeof v==='string'&&/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(v);
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max&&!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v);
async function db(method,resource,params={},data,prefer='return=representation') {return (await axios({method,url:getSupabaseRestUrl(resource),params,data,headers:{...getSupabaseHeaders(),Prefer:prefer},timeout:10000})).data;}
function visitorHash(req) {const token=bearer(req);if(!/^[a-f0-9]{64}$/.test(token||''))throw fail(401,'Resume this chat in the browser tab that created it.');return hash(token);}
const reads=limiter(120),writes=limiter(30),creates=limiter(60,3600000);
const limit=(fn,req,value)=>fn({ip:(req.ip||'unknown')+':'+hash(value||'unknown')});
function validateMessage(body) {if(!uuid(body?.message_id)||!text(body?.body,2000))throw fail(400,'Enter a message of up to 2,000 characters.');return {p_message:body.message_id,p_body:body.body.trim()};}
async function thread(req,staff=false) {
 if(!uuid(req.params.id))throw fail(404,'Chat not found.');
 const params={id:`eq.${req.params.id}`,expires_at:`gt.${new Date().toISOString()}`,limit:1};
 if(!staff)params.access_hash=`eq.${visitorHash(req)}`;
 const rows=await db('get','ministry_chat_threads',params);if(!rows[0])throw fail(404,'Chat not found or expired.');return rows[0];
}
async function transcript(t) {
 const messages=await db('get','ministry_chat_messages',{select:'id,author,body,created_at',thread_id:`eq.${t.id}`,order:'created_at.asc,id.asc',limit:100});
 return {thread:{id:t.id,visitor_name:t.visitor_name,status:t.status,expires_at:t.expires_at,message_count:t.message_count},messages};
}
async function append(params) {try{return await db('post','rpc/append_ministry_chat',{},params)}catch(e){if(e.response?.data?.code==='P0001')throw fail(409,'This chat ended, reached its message limit, or the message changed. Refresh before trying again.');throw e;}}
router.get('/support/availability',wrap(async(req,res)=>{
 const rows=await db('get','ministry_chat_presence',{select:'user_id',until_at:`gt.${new Date().toISOString()}`,limit:1});res.json({available:rows.length>0});
}));
router.post('/support/chats',wrap(async(req,res)=>{
 creates(req);const access=visitorHash(req),body=req.body||{};
 if(!uuid(body.id)||!text(body.name,60)||body.consent!==true)throw fail(400,'Enter a first name or alias and agree to chat storage.');
 const message=validateMessage(body);
 await verifyBot(req,'chat');
 await append({p_thread:body.id,p_access:access,p_name:body.name.trim(),...message,p_staff:null});
 const t=await thread({headers:req.headers,params:{id:body.id}});res.status(201).json(await transcript(t));
}));
router.get('/support/chats/:id',wrap(async(req,res)=>{limit(reads,req,bearer(req));res.json(await transcript(await thread(req)))}));
router.post('/support/chats/:id/messages',wrap(async(req,res)=>{
 limit(writes,req,bearer(req));const t=await thread(req),message=validateMessage(req.body);
 await append({p_thread:t.id,p_access:visitorHash(req),p_name:t.visitor_name,...message,p_staff:null});
 res.json(await transcript(await thread(req)));
}));
router.post('/support/chats/:id/close',wrap(async(req,res)=>{
 limit(writes,req,bearer(req));const t=await thread(req);await db('patch','ministry_chat_threads',{id:`eq.${t.id}`,access_hash:`eq.${visitorHash(req)}`},{status:'closed',updated_at:new Date().toISOString()});res.json({closed:true});
}));
const staff=fn=>wrap(async(req,res)=>{const u=await ministryUser(bearer(req));if(!isEventEditor(u))throw fail(403,'This account cannot access ministry chats.');req.ministryActor=u.id;await fn(req,res,u)});
router.post('/ministry-admin/chat/presence',staff(async(req,res,u)=>{
 if(typeof req.body?.available!=='boolean')throw fail(400,'Choose availability.');
 await db('post','ministry_chat_presence',{on_conflict:'user_id'},{user_id:u.id,until_at:new Date(Date.now()+(req.body.available?90000:0)).toISOString()},'resolution=merge-duplicates,return=minimal');res.json({saved:true});
}));
router.get('/ministry-admin/chats',staff(async(req,res)=>{
 const offset=Number(req.query.offset||0),status=req.query.status||'open';if(!Number.isInteger(offset)||offset<0||offset>100000||!['open','closed'].includes(status))throw fail(400,'Invalid page.');
 res.json({threads:await db('get','ministry_chat_threads',{select:'id,visitor_name,status,created_at,updated_at,expires_at,message_count',status:`eq.${status}`,expires_at:`gt.${new Date().toISOString()}`,order:'updated_at.desc,id.asc',limit:50,offset})});
}));
router.get('/ministry-admin/chats/:id',staff(async(req,res)=>res.json(await transcript(await thread(req,true)))));
router.post('/ministry-admin/chats/:id/messages',staff(async(req,res,u)=>{
 limit(writes,req,u.id);const t=await thread(req,true),message=validateMessage(req.body);
 await append({p_thread:t.id,p_access:null,p_name:t.visitor_name,...message,p_staff:u.id});res.json(await transcript(await thread(req,true)));
}));
router.post('/ministry-admin/chats/:id/close',staff(async(req,res)=>{
 const t=await thread(req,true);await db('patch','ministry_chat_threads',{id:`eq.${t.id}`},{status:'closed',updated_at:new Date().toISOString()});res.json({closed:true});
}));
module.exports={router,validateMessage,visitorHash};
