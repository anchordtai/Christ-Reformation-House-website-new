const express=require('express');
const {fail,wrap,limiter}=require('./ministry-admin');
const {db}=require('./communications/data');
const {ORIGIN,sha}=require('./communications/core');
const {kickNotifications}=require('./communications/notifications');
const router=express.Router(),limit=limiter(60),recipientLimit=limiter(3,3600000);
function registration(body){
 const room=String(body?.room||''),title=String(body?.title||'').trim(),name=String(body?.name||'').trim(),email=String(body?.email||'').trim().toLowerCase();
 if(body?.consent!==true)throw fail(400,'Confirm that we may save your registration and email your meeting confirmation.');
 if(!/^[a-z0-9][a-z0-9_-]{5,99}$/i.test(room)||!name||name.length>100||!title||title.length>100||/[\x00-\x1f<>]/.test(name+title)||email.length>254||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))throw fail(400,'Enter your name, a valid email and a valid meeting invitation.');
 const url=new URL('/meetings/room/'+encodeURIComponent(room),ORIGIN);url.searchParams.set('title',title);if(body.provider==='public')url.searchParams.set('provider','public');
 return {room,title,name,email,invitation_url:url.href};
}
router.post('/meetings/register',wrap(async(req,res)=>{
 limit(req);const input=registration(req.body);recipientLimit({ip:sha(input.email)});
 await require('./site-security').verifyBot(req,'meeting_registration');
 await db('ministry_meeting_registrations','post',{on_conflict:'room,email'},input,'return=minimal,resolution=ignore-duplicates');
 kickNotifications();res.status(202).json({message:'Your registration has been received. A confirmation email is queued for new registrations. Check your inbox and spam folder. Delivery may be delayed by the free daily allowance; registering again does not send a duplicate receipt.'});
}));
module.exports={router,registration};
