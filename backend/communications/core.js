const crypto = require('node:crypto');
const {fail} = require('../ministry-admin');
const CATEGORIES = ['devotional','events','newsletter','services'];
const ORIGIN = 'https://www.christreformationhouse.org.ng';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const token = () => crypto.randomBytes(32).toString('hex');
const validToken = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function categories(value) {
 if (!Array.isArray(value) || !value.length || value.some(x => !CATEGORIES.includes(x))) throw fail(400,'Choose at least one subscription category.');
 return [...new Set(value)];
}
function subscription(body) {
 if (body?.emailConsent !== true) throw fail(400,'Confirm your email subscription consent.');
 const email=String(body.email||'').trim().toLowerCase(),name=String(body.name||'').trim(),phone=String(body.phone||'').trim();
 if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || email.length>254 || !name || name.length>100 || /[\r\n\x00-\x1f]/.test(name)) throw fail(400,'Enter your name and a valid email.');
 if (phone && !/^\+[1-9]\d{7,14}$/.test(phone.replace(/[ ()-]/g,''))) throw fail(400,'Use an international phone number, for example +234 followed by your number without the initial zero.');
 return {email,name,phone:phone.replace(/[ ()-]/g,''),categories:categories(body.categories),sms_consent:body.smsConsent===true};
}
function campaign(body) {
 const channel=body?.channel,category=body?.category;
 if (!['email','sms'].includes(channel) || !CATEGORIES.includes(category)) throw fail(400,'Choose a message channel and category.');
 const subject=String(body.subject||'').trim(),text=String(body.text||'').trim();
 if (!subject || subject.length>160 || /[\r\n]/.test(subject) || !text || text.length>(channel==='sms'?1000:20000)) throw fail(400,'Enter a subject and message within the displayed limits.');
 let image='';
 if(body.image){try{const u=new URL(body.image);if(u.protocol!=='https:'||u.username||u.password)throw Error();image=u.href;if(image.length>1000)throw Error();}catch{throw fail(400,'Use a public HTTPS image URL.');}}
 return {channel,category,subject,text,image};
}
function smsSegments(text) {
 const basic="@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
 const ext='^{}\\[~]|€'; let units=0,unicode=false;
 for(const c of String(text)){if(basic.includes(c))units++;else if(ext.includes(c))units+=2;else{unicode=true;break;}}
 if(unicode)units=String(text).length;
 return {encoding:unicode?'Unicode':'GSM-7',units,segments:units===0?0:Math.ceil(units/(units>(unicode?70:160)?(unicode?67:153):(unicode?70:160)))};
}
function permissions(user) {
 if(user?.app_metadata?.role==='admin')return 'admin';
 const role=user?.app_metadata?.communication_role;
 return ['admin','viewer','editor','manager','approver'].includes(role)?role:null;
}
function emailHtml(subject,text,manageUrl,image='') {
 return `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f5f2ed;color:#233044;font-family:Arial,sans-serif"><main style="max-width:620px;margin:auto;padding:28px;background:white"><img src="${ORIGIN}/assets/img/crhlogo.jpg" width="72" alt="Christ's Reformation House logo"><p style="color:#755598">CHRIST'S REFORMATION HOUSE INTERNATIONAL INC.</p><h1>${escape(subject)}</h1>${image?`<img src="${escape(image)}" alt="Ministry campaign image" style="max-width:100%;height:auto">`:''}<div style="white-space:pre-wrap;line-height:1.7">${escape(text).replace(/https:\/\/www\.christreformationhouse\.org\.ng\/[^\s<>]+/g, url => `<a href="${url}">${url}</a>`)}</div><hr><p>Christ's Reformation House International Inc.</p><p><a href="${ORIGIN}">Visit the ministry website</a></p><p><a href="${escape(manageUrl)}">Manage preferences or unsubscribe</a></p><p style="font-size:12px">You requested ministry email updates. Email opens and clicks, if enabled by the provider, do not prove that a person read the message.</p></main></body></html>`;
}
function providerConfig(env=process.env) {
 // A literal opt-in, verified sender acknowledgement, and key are all required.
 const ready=env.COMMUNICATIONS_EMAIL_ENABLED==='true' && !!env.BREVO_API_KEY && env.BREVO_SENDER_VERIFIED==='true';
 return {email:ready?'configured':'setup_required',sms:'disabled_free_only',dailyCap:280,timezone:'Africa/Lagos',paidSending:false};
}
module.exports={CATEGORIES,ORIGIN,sha,token,validToken,escape,subscription,campaign,smsSegments,permissions,emailHtml,providerConfig};
