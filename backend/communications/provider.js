const axios=require('axios');
const {fail}=require('../ministry-admin');
const {providerConfig}=require('./core');
async function sendEmail(job){
 if(providerConfig().email!=='configured')throw fail(503,'Email sending needs the free Brevo account and verified sender.');
 // Fixed provider URL; one recipient per request. Never silently fall back to paid SMS.
 const result=await axios.post('https://api.brevo.com/v3/smtp/email',{
  sender:{name:"Christ's Reformation House International Inc.",email:'info@christreformationhouse.org.ng'},
  replyTo:{email:'info@christreformationhouse.org.ng'},to:[{email:job.email}],
  subject:job.subject,htmlContent:job.kind==='registration'?require('./notifications').receiptHtml(job.subject,job.text):job.html,textContent:job.text,
  headers:{idempotencyKey:job.id},tags:['crh-communications']
 },{headers:{'api-key':process.env.BREVO_API_KEY,'Content-Type':'application/json'},timeout:20000});
 if(!result.data?.messageId)throw fail(503,'Provider acceptance could not be confirmed.');
 return String(result.data.messageId).replace(/^<|>$/g,'');
}
module.exports={sendEmail};
