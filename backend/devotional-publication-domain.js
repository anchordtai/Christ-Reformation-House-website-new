const {fail}=require('./ministry-admin');
const LANGUAGES={en:'English',yo:'Yorùbá',ig:'Igbo',ha:'Hausa',fr:'Français',nl:'Nederlands',es:'Español',pt:'Português',de:'Deutsch',ar:'العربية',sw:'Kiswahili',el:'Ελληνικά',he:'עברית'};
const STAGES=['not_started','in_progress','completed','language_reviewed','theology_reviewed','approved','published'];
const BRAND='UNLEASH THE SUPERNATURAL';
const string=(v,max,key)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw fail(400,'Complete '+key+'.');return v.trim()};
const list=(v,min,max,key)=>{if(!Array.isArray(v)||v.length<min||v.length>max)throw fail(400,'Complete '+key+' ('+min+'–'+max+' points).');return v.map(x=>string(x,2400,key))};
function validDate(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&s>='2026-11-01'&&s<='2099-12-31'&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s}
function editionKey(date){return date.slice(0,7)}
function monthDay(date){return Number(date.slice(8,10))}
function identity(date){return date.slice(0,7)+'-DAY-'+date.slice(8).padStart(3,'0')}
function validateV2(input,date,language='en'){
 if(!validDate(date)||!LANGUAGES[language]||input?.schemaVersion!==2)throw fail(400,'Use a valid devotional date, language and content format.');
 const c={schemaVersion:2,publicationName:BRAND,publicationDate:date,entryId:identity(date),editionKey:editionKey(date),dayNumber:monthDay(date),dayOfWeek:language!=='en'&&typeof input.dayOfWeek==='string'?input.dayOfWeek:new Date(date+'T12:00:00Z').toLocaleDateString(language,{weekday:'long',timeZone:'UTC'}),language};
 const fields=['title','monthlyTheme','dailyTheme','messageTitle','mainReference','mainPassage','translation','centralTruth','introduction','message','biblicalIllustration','dailyAction','closingPrayer','memoryReference','memoryVerse','socialSummary','author'];
 for(const k of fields)c[k]=string(input[k],k==='message'?16000:k==='socialSummary'?300:8000,k);
 if(language==='en'){
  const count=c.message.trim().split(/\s+/).length;
  if(count<500||count>850)throw fail(400,'The English main teaching must contain 500–800 words (up to 850 for editorial flexibility).');
 }
 for(const [k,min,max] of [['supportingReferences',3,5],['keyLessons',3,5],['reflectionQuestions',3,5],['prayerPoints',4,6],['declarations',3,5]])c[k]=list(input[k],min,max,k);
 c.applications={};for(const k of ['personal','family','work','relationships','service','spiritualGrowth'])c.applications[k]=string(input.applications?.[k],2000,k+' application');
 c.declaration=c.declarations.join('\n\n');c.reflectionQuestion=c.reflectionQuestions.join('\n');
 c.scriptureNotice=language!=='en'&&input.scriptureNotice?string(input.scriptureNotice,1600,'Scripture rendering notice'):language==='en'?'Scripture quotations: King James Version (KJV). See edition copyright notice.':'Scripture wording is a devotional rendering from the English KJV, not an authorised Bible translation. Verify with an appropriately licensed Bible in this language.';
 if(input.quotationReference)c.quotationReference=string(input.quotationReference,120,'quotation reference');
 if(Buffer.byteLength(JSON.stringify(c))>100000)throw fail(400,'Entry exceeds the safe content limit.');
 return c;
}
function nextStage(previous,desired,ack){
 if(!STAGES.includes(desired)||desired==='not_started')throw fail(400,'Choose a valid translation stage.');
 const index=STAGES.indexOf(previous||'not_started');
 if(STAGES.indexOf(desired)!==index+1)throw fail(400,'Complete each translation review stage in order.');
 if(STAGES.indexOf(desired)>=3&&ack!==true)throw fail(400,'Confirm that you completed this review of this exact translation.');
 return desired;
}
function releaseReached(row,now=new Date()){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 return !!row&&['published','scheduled'].includes(row.status)&&!!row.reviewed_by&&!!row.reviewed_at&&!!row.release_at&&Date.parse(row.release_at)<=now.getTime()&&row.publication_date<=today;
}
module.exports={LANGUAGES,STAGES,BRAND,validateV2,validDate,editionKey,monthDay,identity,nextStage,releaseReached};
