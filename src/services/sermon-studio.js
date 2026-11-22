import axios from 'axios'
import {editorToken} from './devotionals'
export const SERMON_API=(import.meta.env.PROD?'https://christ-reformation-house-website-new-1.onrender.com/api':(import.meta.env.VITE_API_URL||'/api')).replace(/\/$/,'')
const client=axios.create({baseURL:SERMON_API,timeout:30000})
export const studioError=e=>e.response?.data?.error||e.message||'Unable to connect. Retry shortly.'
export async function studioRequest(path,body,token){const value=typeof token==='function'?await token():token||editorToken();return client({method:body===undefined?'get':'post',url:'/ministry-admin/'+path,data:body,headers:{Authorization:'Bearer '+(value||'')}}).then(r=>r.data)}
export const readSermons=params=>client.get('/sermon-library',{params}).then(r=>r.data)
export const readSermon=ref=>client.get('/sermon-library/'+encodeURIComponent(ref)).then(r=>r.data)
export const readNotifications=()=>client.get('/church-notifications').then(r=>r.data)
export const readRecordingStatus=room=>client.get('/recording-status/'+encodeURIComponent(room)).then(r=>r.data)
export async function uploadSermonAudio(sermon_id,kind,language,file,token){
 if(!file||file.size>20971520||file.size<12)throw Error('Choose audio up to 20 MiB. Keep long recordings as separate sermon parts.')
 const mime=file.type.split(';')[0],bytes=await file.arrayBuffer(),sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('')
 const permit=await studioRequest('sermon-studio/uploads',{sermon_id,kind,language,mime,bytes:file.size,sha256},token)
 const target=new URL(permit.signedUrl);if(target.protocol!=='https:'||!target.hostname.endsWith('.supabase.co'))throw Error('Invalid storage destination.')
 const result=await fetch(target,{method:'PUT',headers:{'Content-Type':mime,'x-upsert':'false'},body:file})
 if(!result.ok)throw Error('Upload failed. Download and keep your local recording, then retry.')
 return (await studioRequest('sermon-studio/uploads/'+permit.id+'/complete',{},token)).asset
}

export async function sermonLogin(email,password){const r=await client.post("/sermon-studio/login",{email,password});sessionStorage.setItem("crhDevotionalEditorToken",r.data.token)}
