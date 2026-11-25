const express=require('express'),axios=require('axios');
const {getSupabaseHeaders,getSupabaseRestUrl}=require('./supabase');
const {wrap,fail,bearer,limiter}=require('./ministry-admin');
const D=require('./devotional-publication-domain');
const router=express.Router(),readLimit=limiter(600),writeLimit=limiter(180);
async function db(table,method='get',params={},data){return (await axios({url:getSupabaseRestUrl(table),method,params,data,headers:{...getSupabaseHeaders(),Prefer:'return=representation'},timeout:15000})).data}
const staff=fn=>wrap(async(req,res)=>{writeLimit(req);req.editor=await require('./devotionals').verifiedUser(bearer(req));await fn(req,res)});
const month=value=>{if(typeof value!=='string'||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(value)||value<'2026-11')throw fail(400,'Choose a valid publication month.');return value};
const lang=value=>{if(!D.LANGUAGES[value])throw fail(400,'Choose an available language.');return value};
const monthQuery=key=>({and:'(publication_date.gte.'+key+'-01,publication_date.lt.'+new Date(Date.UTC(Number(key.slice(0,4)),Number(key.slice(5)),1)).toISOString().slice(0,10)+')',order:'publication_date.asc',limit:31});
async function entry(date){if(!D.validDate(date))throw fail(400,'Choose a valid devotional date.');const [row]=await db('devotional_entries','get',{publication_date:'eq.'+date,limit:1});if(!row)throw fail(404,'This reading has not been prepared.');return row}
const currentTranslation=(t,row)=>t&&t.source_revision===row.revision&&t.status==='published'&&!!t.language_reviewed_by&&!!t.theology_reviewed_by&&!!t.approved_by;
async function resolved(row,language){
 const base=require('./devotionals').publicEntry(row);if(language==='en')return {entry:base,servedLanguage:'en',notice:''};
 const [t]=await db('devotional_translations','get',{publication_date:'eq.'+row.publication_date,language:'eq.'+language,limit:1});
 return currentTranslation(t,row)?{entry:{...t.content,entryId:D.identity(row.publication_date),publicationDate:row.publication_date,dayNumber:D.monthDay(row.publication_date)},servedLanguage:language,notice:''}:{entry:base,servedLanguage:'en',notice:'This translation has not been released for this reading. The approved English reading is shown instead.'};
}
router.get('/devotional-publication',wrap(async(req,res)=>{readLimit(req);const editions=await db('devotional_editions','get',{status:'in.(announced,published)',select:'edition_key,focus,description,status,cover_path,revision',order:'edition_key.desc',limit:120});res.json({publicationName:D.BRAND,languages:D.LANGUAGES,editions})}));
router.get('/devotional-publication/artwork/:date',wrap(async(req,res)=>{readLimit(req);const row=await entry(req.params.date);if(!D.releaseReached(row))throw fail(404,'This reading has not been released.');const png=await require('sharp')(Buffer.from(require('./devotional-artwork').artwork(row.content))).png().toBuffer();res.type('image/png').send(png)}));
router.get('/devotional-publication/reading/:date',wrap(async(req,res)=>{readLimit(req);const language=lang(req.query.language||'en'),row=await entry(req.params.date);if(!D.releaseReached(row))throw fail(404,'This reading has not been released.');res.json(await resolved(row,language))}));
router.get('/devotional-publication/calendar/:month',wrap(async(req,res)=>{readLimit(req);const key=month(req.params.month),rows=await db('devotional_entries','get',monthQuery(key));res.json({month:key,entries:rows.filter(r=>D.releaseReached(r)).map(r=>({publicationDate:r.publication_date,title:r.content.title,mainReference:r.content.mainReference,dayNumber:r.content.schemaVersion===2?D.monthDay(r.publication_date):r.content.dayNumber}))})}));
router.get('/devotional-editor/publication',staff(async(req,res)=>{const key=month(req.query.month||new Date().toISOString().slice(0,7));const [editions,entries,translations,engagement]=await Promise.all([db('devotional_editions','get',{order:'edition_key.desc',limit:120}),db('devotional_entries','get',monthQuery(key)),db('devotional_translations','get',{...monthQuery(key),limit:403}),db('devotional_engagement','get',{...monthQuery(key)})]);res.json({publicationName:D.BRAND,languages:D.LANGUAGES,stages:D.STAGES,editions,entries,translations,engagement})}));
router.post('/devotional-editor/publication/editions',staff(async(req,res)=>{
 const b=req.body,key=month(b.edition_key);if(!Number.isSafeInteger(b.revision)||b.revision<0||!['draft','announced','published','archived'].includes(b.status))throw fail(400,'Check edition status and revision.');
 if(typeof b.focus!=='string'||!b.focus.trim()||b.focus.length>180||typeof b.description!=='string'||b.description.length>2000)throw fail(400,'Provide an edition focus and description.');
 const cover=String(b.cover_path||'');if(cover&&!/^\/assets\/devotional\/[a-zA-Z0-9_./-]+\.(?:png|jpg|jpeg|webp|svg)$/.test(cover)||cover.includes('..'))throw fail(400,'Choose an existing devotional cover asset.');
 const data={edition_key:key,publication_name:D.BRAND,focus:b.focus.trim(),description:b.description,status:b.status,cover_path:cover,revision:b.revision+1,updated_by:req.editor.id,updated_at:new Date().toISOString()};
 const rows=await db('devotional_editions',b.revision?'patch':'post',b.revision?{edition_key:'eq.'+key,revision:'eq.'+b.revision}:{},data);if(!rows[0])throw fail(409,'Edition changed. Reload before saving.');res.json({edition:rows[0]});
}));
router.get('/devotional-editor/publication/history',staff(async(req,res)=>{const date=req.query.date;if(date&&!D.validDate(date))throw fail(400,'Choose a valid date.');res.json({history:await db('devotional_editorial_audit','get',{...(date?{publication_date:'eq.'+date}:{}),order:'created_at.desc',limit:100})})}));
router.post('/devotional-editor/publication/translations/:date/:language',staff(async(req,res)=>{
 const date=req.params.date,language=lang(req.params.language),row=await entry(date),b=req.body;if(language==='en')throw fail(400,'Edit the English master in the devotional editor.');
 const [old]=await db('devotional_translations','get',{publication_date:'eq.'+date,language:'eq.'+language,limit:1});
 if(!Number.isSafeInteger(b.expectedRevision)||b.expectedRevision!==(old?.revision||0))throw fail(409,'Translation changed. Reload before saving.');
 let values={publication_date:date,language,revision:b.expectedRevision+1,updated_by:req.editor.id,updated_at:new Date().toISOString()};
 if(b.action==='save')Object.assign(values,{content:D.validateV2(b.content,date,language),status:'in_progress',source_revision:row.revision,machine_assisted:true,language_reviewed_by:null,theology_reviewed_by:null,approved_by:null});
 else if(b.action==='advance'){
  if(!old||old.source_revision!==row.revision)throw fail(409,'The English master changed. Update this translation before review.');
  const status=D.nextStage(old.status,b.status,b.reviewAcknowledged);D.validateV2(old.content,date,language);Object.assign(values,{status});
  if(status==='language_reviewed')values.language_reviewed_by=req.editor.id;
  if(status==='theology_reviewed')values.theology_reviewed_by=req.editor.id;
  if(status==='approved')values.approved_by=req.editor.id;
  if(status==='published'&&!['scheduled','published'].includes(row.status))throw fail(400,'Approve and schedule the English master before releasing this translation.');
 }else throw fail(400,'Choose save or advance.');
 const saved=await db('devotional_translations',old?'patch':'post',old?{publication_date:'eq.'+date,language:'eq.'+language,revision:'eq.'+b.expectedRevision}:{},values);if(!saved[0])throw fail(409,'Translation changed. Reload.');res.json({translation:saved[0]});
}));
router.get('/devotional-editor/publication/export/:month',staff(async(req,res)=>{
 const key=month(req.params.month),language=lang(req.query.language||'en'),rows=await db('devotional_entries','get',monthQuery(key));
 const translations=language==='en'?[]:await db('devotional_translations','get',{...monthQuery(key),language:'eq.'+language});
 const records=rows.map(row=>{const t=translations.find(v=>v.publication_date===row.publication_date);return {entryId:D.identity(row.publication_date),publicationDate:row.publication_date,language,status:language==='en'?row.status:t?.status||'not_started',content:language==='en'?row.content:t?.content||null}});
 res.set('Content-Disposition','attachment; filename="unleash-'+key+'-'+language+'.'+(req.query.format==='csv'?'csv':'json')+'"');
 if(req.query.format==='csv'){const cell=v=>'"'+String(v??'').replace(/"/g,'""')+'"';res.type('text/csv').send('\uFEFF'+['entry_id,date,language,status,content_json',...records.map(r=>[r.entryId,r.publicationDate,r.language,r.status,JSON.stringify(r.content)].map(cell).join(','))].join('\r\n'))}else res.json(records);
}));
async function pdfRows(key,language,privatePreview,date){
 let rows=await db('devotional_entries','get',date?{publication_date:'eq.'+date,limit:1}:monthQuery(key));
 if(!rows.length)throw fail(404,'No prepared readings.');
 if(!privatePreview){const days=new Date(Number(key.slice(0,4)),Number(key.slice(5)),0).getDate();if(rows.some(r=>!D.releaseReached(r))||!date&&rows.length!==days)throw fail(404,'The complete reviewed edition is not yet released.');}
 const translations=language==='en'?[]:await db('devotional_translations','get',{...(date?{publication_date:'eq.'+date}:monthQuery(key)),language:'eq.'+language,limit:31});
 const content=[];for(const r of rows){if(language==='en')content.push(r.content);else{const t=translations.find(t=>t.publication_date===r.publication_date);if(!t||!privatePreview&&!currentTranslation(t,r))throw fail(404,'This complete language edition is not available.');content.push(t.content)}}return content;
}
const pdfLimit=limiter(12);
const sendPDF=privatePreview=>async(req,res)=>{
 pdfLimit(req);if(['ar','he'].includes(req.query.language))throw fail(400,'Reviewed right-to-left PDF typesetting is not available yet. Use the website reading and print controls.');const key=month(req.params.month),language=lang(req.query.language||'en'),date=req.query.date;if(date&&(!D.validDate(date)||!date.startsWith(key)))throw fail(400,'Choose a date in this edition.');
 const rows=await pdfRows(key,language,privatePreview,date);const pdf=require('./devotional-pdf');res.type('application/pdf').set('Content-Disposition','attachment; filename="unleash-'+(date||key)+'-'+language+(privatePreview?'-review':'')+'.pdf"');pdf.stream(res,rows,{key,language,draft:privatePreview});
};
router.get('/devotional-publication/pdf/:month',wrap(sendPDF(false)));
router.get('/devotional-editor/publication/pdf/:month',staff(sendPDF(true)));
router.post('/devotional-publication/open/:date',wrap(async(req,res)=>{readLimit(req);if(req.body?.analyticsConsent!==true)throw fail(400,'Anonymous aggregate reading analytics are optional.');const row=await entry(req.params.date);if(!D.releaseReached(row))throw fail(404,'Reading unavailable.');await db('rpc/crh_devotional_open','post',{}, {p_date:row.publication_date});res.json({counted:true})}));
module.exports={router,month,monthQuery,currentTranslation,resolved,pdfRows};
