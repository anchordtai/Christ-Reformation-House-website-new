const express=require('express'),axios=require('axios');
const {getSupabaseHeaders,getSupabaseRestUrl}=require('./supabase');
const {wrap,fail,limiter}=require('./ministry-admin');
const router=express.Router(),limit=limiter(600);
function searchInput(query={}) {
 const q=query.q??'',theme=query.theme??'';
 if(typeof q!=='string'||q.length>120||typeof theme!=='string'||theme.length>160||/[\x00-\x1f]/.test(q+theme))throw fail(400,'Use a search of up to 120 characters and a valid theme.');
 return {p_query:q.trim(),p_theme:theme.trim()};
}
router.get('/devotionals/archive',wrap(async(req,res)=>{
 limit(req);const input=searchInput(req.query);
 // The HTTP caller cannot supply the server-only test clock or editorial status.
 const result=await axios.post(getSupabaseRestUrl('rpc/search_ministry_devotional_archive'),input,{headers:getSupabaseHeaders(),timeout:10000});
 if(!Array.isArray(result.data?.entries)||!Array.isArray(result.data?.themes))throw Error('Invalid archive response');
 res.json(result.data);
}));
module.exports={router,searchInput};
