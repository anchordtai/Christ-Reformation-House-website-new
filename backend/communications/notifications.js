const {escape,ORIGIN,providerConfig}=require('./core');
function receiptHtml(subject,text){
 return `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f5f2ed;color:#233044;font-family:Arial,sans-serif"><main style="max-width:620px;margin:auto;padding:28px;background:white"><img src="${ORIGIN}/assets/img/crhlogo.jpg" width="72" alt="CRH logo"><p>CHRIST'S REFORMATION HOUSE INTERNATIONAL INC. · ZOE ASSEMBLY</p><h1>${escape(subject)}</h1><div style="white-space:pre-wrap;line-height:1.7">${escape(text).replace(/https:\/\/www\.christreformationhouse\.org\.ng\/[^\s<>]+/g,url=>`<a href="${url}">${url}</a>`)}</div><hr><p>This automatic receipt relates only to your request. For help, reply to info@christreformationhouse.org.ng.</p></main></body></html>`;
}
let active;
function kickNotifications(){
 if(providerConfig().email!=='configured'||active)return;
 active=Promise.resolve().then(()=>require('./worker').runWorker({notificationsOnly:true})).catch(()=>console.error('Confirmation email queue will resume on its scheduled run.')).finally(()=>{active=null;});
}
module.exports={receiptHtml,kickNotifications};
