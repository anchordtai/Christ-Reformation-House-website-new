const {db,rpc}=require('./data');
const {token,sha,emailHtml,ORIGIN,providerConfig}=require('./core');
const {sendEmail}=require('./provider');
async function prepareDaily(){
 const [settings]=await db('communication_settings','get',{id:'eq.1',limit:1});
 if(!settings?.daily_devotional||!settings.updated_by)return;
 const now=new Date(),date=require('../devotionals').today(now);
 const time=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Lagos',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
 if(time<settings.daily_time)return;
 const [row]=await db('devotional_entries','get',{publication_date:'eq.'+date,status:'in.(published,scheduled)',reviewed_by:'not.is.null',reviewed_at:'not.is.null',release_at:'lte.'+now.toISOString(),limit:1});
 if(!row||row.publication_date!==date||!require('../devotionals').visible(row,now))return;
 const c=row.content,source='devotional:'+date;
 if((await db('communication_campaigns','get',{source_key:'eq.'+source,select:'id',limit:1})).length)return;
 const sections=[`UNLEASH THE SUPERNATURAL — ${date}`,c.title,c.mainReference,c.mainPassage,c.message,
  'Key lessons',...(c.keyLessons||[]),'Life application',...Object.entries(c.applications||{}).map(([k,v])=>k+': '+v),
  'Faith declaration',c.declaration,'Prayer',...(c.individualPrayers||[]),c.closingPrayer,
  ORIGIN+'/devotional/'+date].filter(Boolean);
 try{await db('communication_campaigns','post',{}, {channel:'email',category:'devotional',subject:('UNLEASH THE SUPERNATURAL: '+c.title).slice(0,160),text:sections.join('\n\n'),source_key:source,source_revision:row.revision,
 status:'scheduled',scheduled_at:now.toISOString(),expires_at:date+'T23:59:59+01:00',created_by:settings.updated_by,approved_by:row.reviewed_by,approved_at:row.reviewed_at});}
 catch(e){if(e.response?.status!==409)throw e;}
}
async function runWorker(){
 if(providerConfig().email!=='configured')return {processed:0,state:'setup_required'};
 await prepareDaily();
 // Bounded work survives Render restarts through durable rows. Claims are never automatically replayed.
 const campaigns=await db('communication_campaigns','get',{status:'eq.scheduled',channel:'eq.email',scheduled_at:'lte.'+new Date().toISOString(),order:'scheduled_at.asc',limit:3});
 for(const a of campaigns){
  const recipients=await rpc('crh_communication_recipients',{p_campaign:a.id});
  if(!recipients.length){
   const pending=await db('communication_jobs','get',{campaign_id:'eq.'+a.id,status:'in.(queued,attempting)',select:'id',limit:1});
   if(!pending.length)await db('communication_campaigns','patch',{id:'eq.'+a.id,status:'eq.scheduled'},{status:'completed'});
  }
  for(const c of recipients){
   const manage=token(),url=ORIGIN+'/subscribe/preferences#token='+manage;
   await db('communication_tokens','post',{}, {hash:sha(manage),contact_id:c.id,purpose:'manage',expires_at:new Date(Date.now()+365*86400000).toISOString()});
   try{await db('communication_jobs','post',{}, {contact_id:c.id,campaign_id:a.id,kind:'campaign',category:a.category,email:c.email,subject:a.subject,text:a.text+'\n\nPreferences / unsubscribe: '+url,html:emailHtml(a.subject,a.text,url,a.image),expires_at:a.expires_at||new Date(new Date(a.scheduled_at).getTime()+2*86400000).toISOString()});}
   catch(e){if(e.response?.status!==409)throw e;}
  }
 }
 let processed=0;
 const stop=Date.now()+90000;
 while(processed<4&&Date.now()<stop){
  const [j]=await rpc('crh_communication_claim',{});if(!j)break;
  // Recheck consent and cancellation immediately before crossing the provider boundary.
  const [c]=await db('communication_contacts','get',{id:'eq.'+j.contact_id,select:'status,categories',limit:1});
  const [a]=j.campaign_id?await db('communication_campaigns','get',{id:'eq.'+j.campaign_id,select:'status,source_key,source_revision',limit:1}):[null];
  let released=true;
  if(a?.source_key?.startsWith('devotional:')){
   const date=a.source_key.slice(11),[reading]=await db('devotional_entries','get',{publication_date:'eq.'+date,limit:1});
   released=!!reading&&reading.publication_date===require('../devotionals').today()&&reading.revision===a.source_revision&&!!require('../devotionals').visible(reading);
  }
  const eligible=released&&c&&(j.kind==='confirm'?c.status==='pending':c.status==='active')&&(!j.campaign_id||(a?.status==='scheduled'&&c.categories.includes(j.category)));
  if(!eligible){await db('communication_jobs','patch',{id:'eq.'+j.id,status:'eq.attempting'},{status:'cancelled',error_code:'consent_or_campaign_changed'});continue;}
  try{
   const providerId=await sendEmail(j);
   await db('communication_jobs','patch',{id:'eq.'+j.id,status:'eq.attempting'},{status:'accepted',provider_id:providerId,updated_at:new Date().toISOString()});
  }catch(e){
   // Even a timeout may mean accepted by Brevo. Staff must reconcile; no blind retry/duplicate send.
   const definitive=[400,401,402,403,422,429].includes(e.response?.status);
   await db('communication_jobs','patch',{id:'eq.'+j.id,status:'eq.attempting'},{status:definitive?'failed':'needs_review',error_code:definitive?'provider_'+e.response.status:'acceptance_unknown',updated_at:new Date().toISOString()});
  }
  processed++;
 }
 return {processed,state:'processed'};
}
module.exports={runWorker,prepareDaily};
