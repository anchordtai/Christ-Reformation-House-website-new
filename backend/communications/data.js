const axios=require('axios');
const {getSupabaseHeaders,getSupabaseRestUrl}=require('../supabase');
async function db(resource,method='get',params={},data){return (await axios({url:getSupabaseRestUrl(resource),method,params,data,headers:{...getSupabaseHeaders(),Prefer:'return=representation'},timeout:15000})).data;}
const rpc=(name,data)=>db('rpc/'+name,'post',{},data);
module.exports={db,rpc};
