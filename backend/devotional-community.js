const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const { getSupabaseHeaders, getSupabaseRestUrl } = require('./supabase');
const { validDate, visible, verifiedUser } = require('./devotionals');
const router = express.Router();
function fail(status,message) { return Object.assign(new Error(message),{status}); }
const wrap = fn => async(req,res)=>{try { await fn(req,res); } catch(e) { res.status(e.status || 503).json({error:e.status?e.message:'Community features are temporarily unavailable. Please try again.'}); }};
async function request(method,table,params={},data,prefer='return=representation') {
  return axios({method,url:getSupabaseRestUrl(table),params,data,headers:{...getSupabaseHeaders(),Prefer:prefer},timeout:10000});
}
async function released(date) {
  if(!validDate(date)) throw fail(400,'Choose a valid reading date.');
  const {data}=await request('get','devotional_entries',{select:'publication_date,status,release_at,reviewed_by,reviewed_at',publication_date:`eq.${date}`,limit:1});
  if(!data?.[0] || !visible(data[0])) throw fail(404,'This reading is not available yet.');
}
function visitor(req,required=true) {
  const value=req.get('X-Devotional-Visitor');
  if(!value&&!required)return null;
  if(typeof value!=='string'||!/^[a-f0-9]{64}$/.test(value))throw fail(400,'Allow browser storage to use likes and comments.');
  return crypto.createHash('sha256').update(value).digest('hex');
}
const limits=new Map();
function throttle(req,hash,kind) {
  const now=Date.now();for(const [k,v]of limits)if(v.until<now)limits.delete(k);
  const keys=[{key:`${kind}:visitor:${hash}`,max:kind==='comment'?5:120},{key:`${kind}:ip:${crypto.createHash('sha256').update(req.ip||'').digest('hex')}`,max:kind==='comment'?30:300}];
  if(limits.size>20000 || keys.some(k=>(limits.get(k.key)?.count||0)>=k.max))throw fail(429,'Please wait before trying again.');
  for(const k of keys){const v=limits.get(k.key)||{count:0,until:now+3600000};v.count++;limits.set(k.key,v);}
}
async function likeCount(date) {
  const r=await request('head','devotional_likes',{select:'publication_date',publication_date:`eq.${date}`},undefined,'count=exact');
  const total=Number(String(r.headers['content-range']||'').split('/')[1]);
  if(!Number.isSafeInteger(total)||total<0)throw new Error('Count unavailable');return total;
}
function offsetValue(value) { if(value===undefined)return 0;if(typeof value!=='string'||!/^\d{1,5}$/.test(value))throw fail(400,'Invalid comment page.');const n=Number(value);if(n>10000)throw fail(400,'Invalid comment page.');return n; }
router.use((req,res,next)=>{res.set('Cache-Control','no-store');next();});
router.get('/devotionals/:date/community',wrap(async(req,res)=>{
  const date=req.params.date;await released(date);const hash=visitor(req,false);const offset=offsetValue(req.query.offset);
  const [count,liked,comments]=await Promise.all([
    likeCount(date),hash?request('get','devotional_likes',{select:'publication_date',publication_date:`eq.${date}`,visitor_hash:`eq.${hash}`,limit:1}):Promise.resolve({data:[]}),
    request('get','devotional_comments',{select:'id,display_name,body,created_at',publication_date:`eq.${date}`,status:'eq.approved',order:'created_at.asc,id.asc',limit:21,offset})
  ]);
  res.json({likes:count,liked:Boolean(liked.data.length),comments:comments.data.slice(0,20),nextOffset:comments.data.length>20?offset+20:null});
}));
router.post('/devotionals/:date/like',wrap(async(req,res)=>{
  const date=req.params.date;const hash=visitor(req);throttle(req,hash,'like');await released(date);
  if(typeof req.body.liked!=='boolean')throw fail(400,'Choose a like state.');
  if(req.body.liked)await request('post','devotional_likes',{on_conflict:'publication_date,visitor_hash'},{publication_date:date,visitor_hash:hash},'resolution=ignore-duplicates,return=minimal');
  else await request('delete','devotional_likes',{publication_date:`eq.${date}`,visitor_hash:`eq.${hash}`});
  res.json({liked:req.body.liked,likes:await likeCount(date)});
}));
router.post('/devotionals/:date/comments',wrap(async(req,res)=>{
  const date=req.params.date;const hash=visitor(req);throttle(req,hash,'comment');await released(date);
  const {displayName,body,submissionId,consent}=req.body;
  if(consent!==true)throw fail(400,'Agree to publish your display name and comment after review.');
  if(typeof displayName!=='string'||displayName.trim().length<2||displayName.trim().length>60||typeof body!=='string'||body.trim().length<3||body.trim().length>2000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(displayName+body))throw fail(400,'Use a name of 2–60 characters and a comment of 3–2,000 characters.');
  if(typeof submissionId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId))throw fail(400,'Please retry this comment.');
  await request('post','devotional_comments',{on_conflict:'publication_date,visitor_hash,submission_id'},{publication_date:date,visitor_hash:hash,submission_id:submissionId,display_name:displayName.trim(),body:body.trim(),status:'pending'},'resolution=ignore-duplicates,return=minimal');
  res.status(202).json({message:'Your comment has been submitted for review. It will appear after approval.'});
}));
router.use('/devotional-editor/comments',async(req,res,next)=>{
  try {req.editor=await verifiedUser(/^Bearer (.+)$/.exec(req.headers.authorization||'')?.[1]);next();}
  catch(e){res.status(e.status||503).json({error:e.status?e.message:'Unable to verify editor access.'});}
});
router.get('/devotional-editor/comments',wrap(async(req,res)=>{
  const status=req.query.status||'pending';if(!['pending','approved','rejected'].includes(status))throw fail(400,'Invalid comment status.');
  const offset=offsetValue(req.query.offset);
  const {data}=await request('get','devotional_comments',{select:'id,publication_date,display_name,body,status,created_at',status:`eq.${status}`,order:'created_at.desc,id.desc',limit:51,offset});
  res.json({comments:data.slice(0,50),nextOffset:data.length>50?offset+50:null});
}));
router.post('/devotional-editor/comments/:id/review',wrap(async(req,res)=>{
  if(!/^[0-9a-f-]{36}$/.test(req.params.id)||!['approved','rejected'].includes(req.body.status)||!['pending','approved','rejected'].includes(req.body.expectedStatus))throw fail(400,'Choose an approval or rejection.');
  const {data}=await request('patch','devotional_comments',{id:`eq.${req.params.id}`,status:`eq.${req.body.expectedStatus}`},{status:req.body.status,reviewed_by:req.editor.id,reviewed_at:new Date().toISOString()});
  if(!data?.[0])throw fail(409,'This comment changed. Refresh the moderation list.');
  res.json({message:req.body.status==='approved'?'Comment approved.':'Comment hidden.'});
}));
module.exports={router};
