const axios=require('axios');
const {getSupabaseHeaders,getSupabaseRestUrl}=require('../supabase');
const {fail}=require('../ministry-admin');
async function db(resource,method='get',params={},data,prefer='return=representation'){
 try{return (await axios({method,url:getSupabaseRestUrl(resource),params,data,headers:{...getSupabaseHeaders(),Prefer:prefer},timeout:15000})).data;}
 catch(e){if(e.response?.data?.code==='P0001')throw fail(409,String(e.response.data.message).slice(0,240));if(e.response?.status===409)throw fail(409,'This record already exists or changed. Refresh before continuing.');throw e;}
}
const audit=(actor,action,resource,id)=>db('crism_audit','post',{}, {actor,action,resource,record_id:id});
const action=(actor,name,id,data={})=>db('rpc/crism_action','post',{}, {p_actor:actor,p_action:name,p_id:id,p_data:data});
module.exports={db,audit,action};
