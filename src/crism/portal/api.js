import axios from 'axios'
const client=axios.create({baseURL:import.meta.env.PROD?'https://christ-reformation-house-website-new-1.onrender.com/api':(import.meta.env.VITE_API_URL||'/api'),timeout:25000})
const key='crismSession'
export function session(){try{return JSON.parse(sessionStorage.getItem(key)||'null')}catch{return null}}
export function remember(s){sessionStorage.setItem(key,JSON.stringify(s))}
export function forget(){sessionStorage.removeItem(key)}
let refresh
export async function request(path,body,options={}){const s=session();try{return (await client({url:'/crism'+path,method:body===undefined?'get':'post',data:body,headers:s?{Authorization:'Bearer '+s.token}:{},...options})).data}catch(e){if(e.response?.status===401&&s?.refresh_token&&!path.startsWith('/auth/')&&!options._retry){if(!refresh)refresh=client.post('/crism/auth/refresh',{refresh_token:s.refresh_token}).then(r=>{remember(r.data);return r.data}).finally(()=>{refresh=null});try{await refresh;return request(path,body,{...options,_retry:true})}catch{forget()}}throw e}}
export const message=e=>e.response?.data?.error||e.message||'Unable to connect. Try again.'
export async function download(path,name){const blob=await request(path,undefined,{responseType:'blob'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
export const money=(minor,currency='NGN')=>new Intl.NumberFormat(undefined,{style:'currency',currency}).format(Number(minor)/100)
export const localTime=value=>value?new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):'To be announced'

export const globalRequest=(path,body,options={})=>request(path,body,{...options,url:'/global'+path})
