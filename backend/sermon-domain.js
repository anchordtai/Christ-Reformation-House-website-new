const {fail}=require('./ministry-admin');
const crypto=require('node:crypto');
const {uuid,slug,text,escapeHtml}=require('./blog-data');
const LANGUAGES={en:'English',yo:'Yoruba',ig:'Igbo',ha:'Hausa',fr:'French',nl:'Dutch',el:'Greek',he:'Hebrew',es:'Spanish',pt:'Portuguese',de:'German',ar:'Arabic',sw:'Swahili',zh:'Chinese'};
const CATEGORIES=['Sunday service','Bible study','Sermon','Prayer meeting','Special program','Conference','Crusade','Teaching'];
const MAX_FILE=20*1024*1024;
const released=(s,now=Date.now())=>!!s&&s.visibility==='public'&&['published','scheduled'].includes(s.status)&&!!s.reviewed_at&&s.consent===true&&Date.parse(s.publish_at)<=now;
const canStudio=u=>u?.app_metadata?.role==='admin'||u?.app_metadata?.sermon_editor===true;
function validateSermon(b,actor){
 if(!b||!uuid(b.id)||!slug(b.slug)||!Number.isInteger(b.revision)||b.revision<0)throw fail(400,'Check the sermon reference, slug and revision.');
 if(!CATEGORIES.includes(b.category)||!['public','private'].includes(b.visibility)||!['draft','awaiting_review','scheduled','published','archived'].includes(b.status))throw fail(400,'Check sermon category, visibility and status.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(b.sermon_date||'')||(!Number.isFinite(Date.parse(b.sermon_date))||new Date(b.sermon_date).toISOString().slice(0,10)!==b.sermon_date))throw fail(400,'Choose a valid sermon date.');
 const value={id:b.id,slug:b.slug,title:text(b.title,160,'title'),speaker:text(b.speaker,120,'speaker'),sermon_date:b.sermon_date,theme:text(b.theme||'',200,'theme',0),scripture:text(b.scripture||'',500,'scripture',0),summary:text(b.summary||'',4000,'summary',0),series:text(b.series||'',120,'series',0),notes:text(b.notes||'',15000,'study notes',0),category:b.category,visibility:b.visibility,status:b.status,consent:b.consent===true,automation_approved:b.automation_approved===true,updated_by:actor,revision:b.revision+1,updated_at:new Date().toISOString(),reviewed_at:null,publish_at:null};
 for(const k of ['original_id','enhanced_id']){value[k]=b[k]||null;if(value[k]&&!uuid(value[k]))throw fail(400,'Select a verified recording.');}
 value.video_id=b.video_id||'';if(value.video_id&&!/^[A-Za-z0-9_-]{11}$/.test(value.video_id))throw fail(400,'Use a YouTube video ID.');
 if(!Array.isArray(b.chapters)||b.chapters.length>100)throw fail(400,'Use up to 100 chapters.');
 let last=-1;value.chapters=b.chapters.map(c=>{if(!Number.isFinite(c.seconds)||c.seconds<0||c.seconds<=last||c.seconds>43200)throw fail(400,'Chapter times must increase.');last=c.seconds;return {seconds:c.seconds,title:text(c.title,120,'chapter title')};});
 if(!b.translations||typeof b.translations!=='object'||Array.isArray(b.translations)||Object.keys(b.translations).length>14)throw fail(400,'Check translations.');
 value.translations={};let total=0;
 for(const [language,t]of Object.entries(b.translations)){
  if(!LANGUAGES[language]||!t||!['draft','reviewed'].includes(t.status))throw fail(400,'Choose a supported language and review status.');
  const transcript=text(t.transcript||'',60000,'transcript',0),subtitles=text(t.subtitles||'',60000,'WebVTT subtitles',0);total+=transcript.length+subtitles.length;
  if(total>70000)throw fail(400,'Keep combined transcript and subtitles under 70,000 characters.');
  if(subtitles&&(!subtitles.startsWith('WEBVTT')||/<(?!\/?(?:b|i|u|c|v|lang)(?:[ .>]))/i.test(subtitles)||/-->\s*\S+\s*-->/m.test(subtitles)))throw fail(400,'Use plain WebVTT captions without HTML.');
  const audio_id=t.audio_id||null;if(audio_id&&!uuid(audio_id))throw fail(400,'Choose verified translated audio.');
  value.translations[language]={transcript,subtitles,status:t.status,audio_id,synthetic:t.synthetic===true};
  if(language!=='en'&&audio_id&&t.synthetic!==true)throw fail(400,'Label translated audio as generated or translated.');
 }
 if(['published','scheduled'].includes(value.status)){
  if(value.visibility!=='public'||!value.consent||b.reviewed!==true||!value.original_id)throw fail(400,'Public release needs consent, a verified original and explicit review.');
  if(!b.publish_at||!Number.isFinite(Date.parse(b.publish_at)))throw fail(400,'Choose a release time.');
  value.publish_at=new Date(b.publish_at).toISOString();value.reviewed_at=new Date().toISOString();
  if(value.status==='published'&&Date.parse(value.publish_at)>Date.now())throw fail(400,'Choose Scheduled for a future release.');
 }
 return value;
}
function validateAnnouncement(b,actor){
 if(!uuid(b.id)||!Number.isInteger(b.revision)||b.revision<0)throw fail(400,'Reload the announcement.');
 if(!['draft','published','cancelled'].includes(b.status)||!['normal','important','urgent'].includes(b.priority)||!['announcement','event','sermon','journal','devotional','meeting'].includes(b.category))throw fail(400,'Check announcement settings.');
 if(!Number.isFinite(Date.parse(b.starts_at))||!Number.isFinite(Date.parse(b.expires_at)))throw fail(400,'Choose a valid start and expiry.');
 const starts_at=new Date(b.starts_at).toISOString(),expires_at=new Date(b.expires_at).toISOString();
 if(Date.parse(expires_at)<=Date.parse(starts_at))throw fail(400,'Expiry must follow the start time.');
 const href=text(b.href||'/notifications',220,'destination');if(!/^\/(?!\/)[a-z0-9/?=&#%-]*$/i.test(href)||href.includes('\\'))throw fail(400,'Use a local church website link.');
 const pages=Array.isArray(b.pages)?b.pages:[];if(pages.length>20||pages.some(p=>!['*','/','/watch','/sermons','/events','/blog','/devotional','/meetings'].includes(p)))throw fail(400,'Choose supported target pages.');
 return {id:b.id,title:text(b.title,160,'title'),body:text(b.body||'',2000,'message',0),href,starts_at,expires_at,pages,status:b.status,priority:b.priority,category:b.category,pinned:b.pinned===true,revision:b.revision+1,updated_by:actor,updated_at:new Date().toISOString()};
}
function sniffAudio(buffer,mime){
 if(!Buffer.isBuffer(buffer)||buffer.length<12||buffer.length>MAX_FILE)return false;
 if(mime==='audio/webm')return buffer.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
 if(mime==='audio/ogg')return buffer.toString('ascii',0,4)==='OggS';
 if(mime==='audio/wav')return buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WAVE';
 if(mime==='audio/mpeg')return buffer.toString('ascii',0,3)==='ID3'||(buffer[0]===255&&(buffer[1]&224)===224);
 if(mime==='audio/mp4')return buffer.toString('ascii',4,8)==='ftyp';
 return false;
}
function verifiedAudio(buffer,asset){return buffer.length===Number(asset.expected_bytes)&&sniffAudio(buffer,asset.mime)&&crypto.createHash('sha256').update(buffer).digest('hex')===asset.sha256;}
function artwork(s){const lines=s.title.match(/.{1,32}(?:\s|$)|.{1,32}/g)||[s.title];return '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><linearGradient id="g"><stop stop-color="#101a39"/><stop offset="1" stop-color="#40245c"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/><circle cx="1080" cy="40" r="300" fill="#cba25e" opacity=".12"/><path d="M70 90H1130M70 540H1130" stroke="#d7b676" stroke-width="2"/><g fill="#e4c78b" font-family="Georgia,serif"><text x="75" y="65" font-size="22">CHRIST’S REFORMATION HOUSE INTERNATIONAL INC.</text><text x="75" y="140" font-size="22">'+escapeHtml(s.category.toUpperCase())+'</text></g><g fill="white" font-family="Georgia,serif" font-size="56">'+lines.slice(0,4).map((v,i)=>'<text x="75" y="'+(220+i*65)+'">'+escapeHtml(v.trim())+'</text>').join('')+'</g><g fill="#e4c78b" font-family="Arial,sans-serif" font-size="23"><text x="75" y="510">'+escapeHtml(s.speaker)+' · '+escapeHtml(s.sermon_date)+'</text><text x="75" y="585">'+escapeHtml(s.scripture.slice(0,85))+'</text></g></svg>';}
module.exports={LANGUAGES,CATEGORIES,MAX_FILE,released,canStudio,validateSermon,validateAnnouncement,sniffAudio,verifiedAudio,artwork};
