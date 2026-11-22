const express=require('express');
const {db,uuid}=require('./blog-data');
const {fail,wrap,ministryUser,bearer,limiter}=require('./ministry-admin');
const {canStudio,validateAnnouncement}=require('./sermon-domain');
const {publicBroadcast}=require('./live-broadcast');
const router=express.Router(),reads=limiter(180),writes=limiter(60);
const staff=fn=>wrap(async(req,res)=>{const u=await ministryUser(bearer(req));if(!canStudio(u))throw fail(403,'Notification Studio permission required.');await fn(req,res,u);});
let cached;
async function feed(now=Date.now()){
 if(cached&&cached.expires>now)return cached.value;
 const at=new Date(now).toISOString();
 const sources=[
  ['announcements',()=>db('ministry_announcements','get',{status:'eq.published',starts_at:'lte.'+at,expires_at:'gt.'+at,order:'starts_at.desc',limit:30})],
  ['sermons',()=>db('ministry_sermons','get',{visibility:'eq.public',consent:'eq.true',status:'in.(published,scheduled)',reviewed_at:'not.is.null',publish_at:'lte.'+at,select:'id,slug,title,summary,publish_at',order:'publish_at.desc',limit:8})],
  ['events',()=>db('ministry_events','get',{published:'eq.true',ends_at:'gt.'+at,select:'id,title,starts_at,ends_at,registration_enabled',order:'starts_at.asc',limit:8})],
  ['journal',()=>db('ministry_blog_posts','get',{status:'in.(published,scheduled)',reviewed_at:'not.is.null',publish_at:'lte.'+at,select:'id,slug,title,publish_at',order:'publish_at.desc',limit:5})],
  ['devotional',()=>db('devotional_entries','get',{status:'in.(published,scheduled)',reviewed_at:'not.is.null',reviewed_by:'not.is.null',release_at:'lte.'+at,publication_date:'lte.'+new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now)),select:'publication_date,release_at,content',order:'publication_date.desc',limit:3})],
  ['broadcast',()=>db('ministry_broadcast','get',{id:'eq.1',limit:1})],
  ['meetings',()=>db('ministry_sermon_sessions','get',{expires_at:'gt.'+at,state:'in.(recording,paused,ended)',select:'sermon_id,room,state,updated_at',limit:10})]
 ];
 const results=await Promise.allSettled(sources.map(([,read])=>read())),items=[],unavailable=[];
 const push=(i)=>items.push({priority:'normal',pinned:false,pages:['*'],...i});
 for(let n=0;n<results.length;n++){
  const [source]=sources[n],r=results[n];if(r.status!=='fulfilled'){unavailable.push(source);continue;}
  for(const row of r.value){
   if(source==='announcements')push({title:row.title,body:row.body,href:row.href,category:row.category,priority:row.priority,pinned:row.pinned,pages:row.pages,key:'announcement:'+row.id+':'+row.revision,date:row.starts_at});
   if(source==='sermons')push({key:'sermon:'+row.id,category:'sermon',title:row.title,body:'A new sermon is available to listen, study and share.',href:'/sermons/'+row.slug,date:row.publish_at});
   if(source==='events')push({key:'event:'+row.id+':'+row.starts_at,category:'event',title:row.title,body:(Date.parse(row.starts_at)<=now?'Taking place now. ': 'Upcoming church gathering. ')+(row.registration_enabled?'Registration is open.':''),href:row.registration_enabled?'/events/register/'+row.id:'/events',date:row.starts_at});
   if(source==='journal')push({key:'journal:'+row.id,category:'journal',title:row.title,body:'Read the latest message in our church journal.',href:'/blog/'+row.slug,date:row.publish_at});
   if(source==='devotional')push({key:'devotional:'+row.publication_date,category:'devotional',title:row.content?.title||'UNLEASH THE SUPERNATURAL',body:'Read and share the daily devotional.',href:'/devotional/'+row.publication_date,date:row.release_at});
   if(source==='broadcast'){const b=publicBroadcast(row,now);if(['live','scheduled'].includes(b.state))push({key:'broadcast:'+row.revision,category:'live service',title:b.title,body:b.state==='live'?'Live service announced by the ministry.':'A broadcast is scheduled.',href:'/watch',priority:b.state==='live'?'urgent':'normal',pinned:b.state==='live',date:b.starts_at});}
   if(source==='meetings'){
    const sermons=await db('ministry_sermons','get',{id:'eq.'+row.sermon_id,visibility:'eq.public',consent:'eq.true',select:'title',limit:1});
    if(sermons[0])push({key:'meeting:'+row.sermon_id,category:'live service',title:sermons[0].title,body:row.state==='ended'?'The gathering has ended. Its recording is awaiting processing or review.':row.state==='paused'?'Meeting recording paused.':'Meeting recording is in progress. The host has enabled a recording notice.',href:row.state==='ended'?'/sermons':'/meetings/room/'+row.room,priority:'important',pinned:true,date:row.updated_at});
   }
  }
 }
 const value={items:items.sort((a,b)=>Number(b.pinned)-Number(a.pinned)||Date.parse(b.date)-Date.parse(a.date)),unavailable,updatedAt:at};cached={expires:now+30000,value};return value;
}
router.get('/church-notifications',wrap(async(req,res)=>{reads(req);res.set('Cache-Control','public,max-age=20');res.json(await feed());}));
router.get('/ministry-admin/announcements',staff(async(req,res)=>{const offset=Number(req.query.offset||0);if(!Number.isInteger(offset)||offset<0||offset>100000)throw fail(400,'Invalid page.');res.json({announcements:await db('ministry_announcements','get',{order:'starts_at.desc',limit:50,offset})});}));
router.post('/ministry-admin/announcements',staff(async(req,res,u)=>{writes(req);const p=validateAnnouncement(req.body,u.id);let r;if(req.body.revision===0)r=await db('ministry_announcements','post',{on_conflict:'id'},p,'return=representation,resolution=ignore-duplicates');else r=await db('ministry_announcements','patch',{id:'eq.'+p.id,revision:'eq.'+req.body.revision},p);if(!r[0])throw fail(409,'Announcement changed. Reload before saving.');cached=null;res.json({announcement:r[0]});}));
module.exports={router,feed};
