const express=require('express'),axios=require('axios'),crypto=require('node:crypto');
const {getSupabaseHeaders}=require('../supabase');
const {fail,wrap,limiter,ministryUser,bearer}=require('../ministry-admin');
const core=require('./core'),{db,rpc}=require('./data');
const router=express.Router(),limit=limiter(8,3600000),tokenLimit=limiter(60,3600000),loginLimit=limiter(10,600000),staffLimit=limiter(120),uuid=v=>typeof v==='string'&&/^[a-f0-9-]{36}$/i.test(v);
const staff=(roles,fn)=>wrap(async(req,res)=>{staffLimit(req);const user=await ministryUser(bearer(req)),role=core.permissions(user);if(!role||!roles.includes(role))throw fail(403,'Your communication role does not allow this action.');req.ministryActor=user.id;await fn(req,res,user,role);});
const all=['admin','approver','manager','editor','viewer'];
router.get('/communications/config',wrap(async(req,res)=>res.json(core.providerConfig())));
router.post('/communications/subscribe',wrap(async(req,res)=>{
 limit(req);if(req.body?.website)return res.status(202).json({message:'If eligible, a confirmation email will be queued.'});
 if(core.providerConfig().email!=='configured')throw fail(503,'Email subscriptions are being prepared. Please try again after the ministry activates its free email account.');
 if(!require('../site-security').botConfig().ready)throw fail(503,'Subscription verification is being prepared. Please try again later.');
 await require('../site-security').verifyBot(req,'subscribe');const c=core.subscription(req.body);
 if(core.providerConfig().email!=='configured')throw fail(503,'Email subscriptions are being prepared. Please try again after the ministry activates its free email account.');
 const confirm=core.token(),manage=core.token(),link=core.ORIGIN+'/subscribe/confirm#token='+confirm,preferences=core.ORIGIN+'/subscribe/preferences#token='+manage;
 const text='Confirm that you requested ministry email updates. Your categories: '+c.categories.join(', ')+'.\n\nConfirm subscription: '+link+'\n\nIf you did not request this, ignore this email. This link expires in 24 hours.';
 await rpc('crh_communication_subscribe',{p_email:c.email,p_name:c.name,p_phone:c.phone,p_categories:c.categories,p_sms:c.sms_consent,p_confirm_hash:core.sha(confirm),p_manage_hash:core.sha(manage),p_text:text,p_html:core.emailHtml('Confirm your CRH subscription',text,preferences)});
 res.status(202).json({message:'If this address is eligible, a confirmation email is queued. Delivery can be delayed by the free daily allowance. Check your inbox and spam folder; your subscription starts only after confirmation.'});
}));
router.post('/communications/confirm',wrap(async(req,res)=>{
 tokenLimit(req);if(!core.validToken(req.body?.token))throw fail(400,'This confirmation link is invalid.');
 const [t]=await db('communication_tokens','get',{hash:'eq.'+core.sha(req.body.token),purpose:'eq.confirm',used_at:'is.null',expires_at:'gt.'+new Date().toISOString(),limit:1});
 if(!t)throw fail(400,'This link has expired or was already used.');
 const manage=core.token(),url=core.ORIGIN+'/subscribe/preferences#token='+manage;
 await db('communication_tokens','post',{}, {hash:core.sha(manage),contact_id:t.contact_id,purpose:'manage',expires_at:new Date(Date.now()+365*86400000).toISOString()});
 const text='Thank you for confirming your subscription. You can choose your devotional, event, service and newsletter updates or unsubscribe at any time.\n\n'+url;
 if(!await rpc('crh_communication_confirm',{p_hash:core.sha(req.body.token),p_text:text,p_html:core.emailHtml('Welcome to CRH updates',text,url)}))throw fail(400,'This link has expired or was already used.');
 res.json({message:'Your email subscription is confirmed. A welcome email is queued.'});
}));
router.post('/communications/preferences',wrap(async(req,res)=>{
 tokenLimit(req);if(!core.validToken(req.body?.token))throw fail(400,'Use the preferences link from a ministry email.');
 const unsubscribe=req.body.unsubscribe===true,categories=unsubscribe?[]:core.categories(req.body.categories);
 if(!await rpc('crh_communication_preferences',{p_hash:core.sha(req.body.token),p_categories:categories,p_unsubscribe:unsubscribe}))throw fail(400,'This link cannot update the subscription. Use a current email link or contact the ministry.');
 res.json({message:unsubscribe?'You have been unsubscribed. Queued messages will not be sent.':'Your preferences have been updated.'});
}));
router.post('/communications/login',wrap(async(req,res)=>{
 loginLimit(req);const b=req.body||{};if(typeof b.email!=='string'||b.email.length>254||typeof b.password!=='string'||b.password.length>256)throw fail(400,'Enter your staff email and password.');
 let result;try{result=await axios.post(String(process.env.SUPABASE_URL||'').replace(/\/$/,'')+'/auth/v1/token?grant_type=password',{email:b.email,password:b.password},{headers:getSupabaseHeaders(),timeout:10000});}catch{throw fail(401,'Sign-in failed. Check your staff account.');}
 const u=await ministryUser(result.data.access_token),role=core.permissions(u);if(!role)throw fail(403,'A communication role is required. Ask the ministry administrator.');
 res.json({token:result.data.access_token,role});
}));
router.get('/ministry-admin/communications',staff(all,async(req,res,user,role)=>{
 const offset=Number(req.query.offset||0);if(!Number.isSafeInteger(offset)||offset<0||offset>100000)throw fail(400,'Invalid page.');
 const [campaigns,jobs,contacts,settings]=await Promise.all([
 db('communication_campaigns','get',{order:'created_at.desc',limit:30}),
 db('communication_jobs','get',{select:'id,campaign_id,kind,status,error_code,provider_id,created_at,updated_at',order:'created_at.desc',limit:50}),
 ['admin','manager','approver'].includes(role)?db('communication_contacts','get',{select:'id,name,email,phone,status,categories,sms_consent,created_at',order:'created_at.desc',limit:50,offset}):Promise.resolve([]),db('communication_settings','get',{id:'eq.1',limit:1})]);
 res.json({role,settings:settings[0],config:core.providerConfig(),campaigns,jobs,contacts,scope:'Latest 30 campaigns, 50 delivery attempts and one page of 50 contacts. Provider acceptance is not delivery.'});
}));
router.post('/ministry-admin/communications/preview',staff(['admin','approver','manager','editor'],async(req,res)=>{const c=core.campaign(req.body);res.json({html:core.emailHtml(c.subject,c.text,core.ORIGIN+'/subscribe',c.image),sms:core.smsSegments(c.text)});}));
router.post('/ministry-admin/communications/campaigns',staff(['admin','approver','manager','editor'],async(req,res,u)=>{
 if(!uuid(req.body?.creationKey))throw fail(400,'Reload the composer before saving.');
 const c=core.campaign(req.body);let row;
 try{[row]=await db('communication_campaigns','post',{}, {...c,created_by:u.id,creation_key:req.body.creationKey});}
 catch(e){if(e.response?.status!==409)throw e;[row]=await db('communication_campaigns','get',{creation_key:'eq.'+req.body.creationKey,limit:1});if(!row||row.created_by!==u.id||Object.entries(c).some(([k,v])=>row[k]!==v))throw fail(409,'This save was already used. Reload campaigns before creating another.');}

 await db('communication_activity','post',{}, {actor_id:u.id,action:'draft_created',campaign_id:row.id});res.status(201).json({campaign:row});
}));
router.post('/ministry-admin/communications/campaigns/:id/schedule',staff(['admin','approver'],async(req,res,u)=>{
 if(!uuid(req.params.id)||!Number.isSafeInteger(req.body?.revision))throw fail(400,'Reload the campaign before scheduling.');
 if(core.providerConfig().email!=='configured')throw fail(503,'Configure the free email sender before scheduling. SMS delivery is disabled.');
 const date=new Date(req.body.scheduledAt);if(!req.body.scheduledAt||!/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(req.body.scheduledAt)||!Number.isFinite(date.getTime())||date<Date.now()-1000||date>Date.now()+366*86400000)throw fail(400,'Choose a future time with a time zone.');
 if(req.body.approved!==true)throw fail(400,'Confirm message review and consent-based recipient selection.');
 const [row]=await db('communication_campaigns','patch',{id:'eq.'+req.params.id,status:'eq.draft',channel:'eq.email',revision:'eq.'+req.body.revision},{status:'scheduled',scheduled_at:date.toISOString(),approved_by:u.id,approved_at:new Date().toISOString(),revision:req.body.revision+1});
 if(!row)throw fail(409,'Campaign changed, is not an email draft, or is already scheduled. Reload it.');
 await db('communication_activity','post',{}, {actor_id:u.id,action:'approved_and_scheduled',campaign_id:row.id});res.json({campaign:row});
}));
router.post('/ministry-admin/communications/campaigns/:id/cancel',staff(['admin','approver','manager'],async(req,res,u)=>{
 if(!uuid(req.params.id)||!Number.isSafeInteger(req.body?.revision))throw fail(400,'Reload this campaign.');
 const [row]=await db('communication_campaigns','patch',{id:'eq.'+req.params.id,revision:'eq.'+req.body.revision,status:'in.(draft,scheduled)'},{status:'cancelled',revision:req.body.revision+1});if(!row)throw fail(409,'Campaign changed. Reload it.');
 await db('communication_jobs','patch',{campaign_id:'eq.'+row.id,status:'eq.queued'},{status:'cancelled'});
 await db('communication_activity','post',{}, {actor_id:u.id,action:'campaign_cancelled',campaign_id:row.id});res.json({campaign:row});
}));
router.post('/ministry-admin/communications/settings',staff(['admin','approver'],async(req,res,u)=>{
 const b=req.body||{};if(typeof b.dailyDevotional!=='boolean'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(b.dailyTime||''))throw fail(400,'Choose a valid daily delivery time in Nigeria.');
 if(b.dailyDevotional&&core.providerConfig().email!=='configured')throw fail(503,'Configure the free email sender first.');
 const [settings]=await db('communication_settings','patch',{id:'eq.1'},{daily_devotional:b.dailyDevotional,daily_time:b.dailyTime,updated_by:u.id,updated_at:new Date().toISOString()});
 await db('communication_activity','post',{}, {actor_id:u.id,action:b.dailyDevotional?'daily_devotional_enabled':'daily_devotional_paused'});res.json({settings});
}));
const webhookLimit=limiter(600,60000);
router.post('/communications/webhooks/brevo',wrap(async(req,res)=>{
 const expected=process.env.COMMUNICATIONS_WEBHOOK_SECRET||'',value=bearer(req)||'';
 if(expected.length<32||value.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(value),Buffer.from(expected)))throw fail(401,'Webhook authorization required.');
 webhookLimit(req);const b=req.body||{},event=b.event,id=String(b['message-id']||'').replace(/^<|>$/g,'');
 const events=['delivered','hard_bounce','soft_bounce','spam','unsubscribed','invalid_email','blocked','error'];
 if(!events.includes(event))return res.status(204).end();
 if(!id||id.length>254||typeof b.email!=='string'||b.email.length>254||!Number.isFinite(b.ts_event))throw fail(400,'Invalid delivery event.');
 const at=new Date(b.ts_event*1000);if(!Number.isFinite(at.getTime())||at.getTime()>Date.now()+300000)throw fail(400,'Invalid event time.');
 const [j]=await db('communication_jobs','get',{provider_id:'eq.'+id,email:'eq.'+b.email.toLowerCase(),select:'id',limit:1});
 if(!j)throw fail(503,'Message reference not yet reconciled. Retry this event later.');
 await rpc('crh_communication_event',{p_job:j.id,p_key:core.sha(j.id+':'+event+':'+b.ts_event),p_event:event,p_at:at.toISOString()});
 res.status(204).end();
}));
function workerAuthorized(req){const expected=process.env.COMMUNICATIONS_WORKER_SECRET||'',value=bearer(req)||'';return expected.length>=32&&value.length===expected.length&&crypto.timingSafeEqual(Buffer.from(value),Buffer.from(expected));}
router.post('/communications/process',wrap(async(req,res)=>{if(!workerAuthorized(req))throw fail(401,'Worker authorization required.');res.json(await require('./worker').runWorker());}));
router.use(require('./whatsapp-routes')(staff));
module.exports={router,workerAuthorized};
