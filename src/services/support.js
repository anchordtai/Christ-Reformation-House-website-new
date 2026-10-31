import axios from 'axios'
import {editorToken} from './devotionals'
const baseURL=(import.meta.env.PROD?'https://christ-reformation-house-website-new-1.onrender.com/api':(import.meta.env.VITE_API_URL||'/api')).replace(/\/$/,'')
const client=axios.create({baseURL,timeout:20000})
const auth=token=>({headers:{Authorization:`Bearer ${token||''}`}})
export const supportError=e=>e.response?.data?.error||'Unable to connect. Keep this tab open and retry; your draft is preserved.'
export const supportConfig=()=>client.get('/support/config').then(r=>r.data)
export const chatAvailability=()=>client.get('/support/availability').then(r=>r.data.available)
export const startChat=(s,body)=>client.post('/support/chats',{id:s.id,...body},auth(s.token)).then(r=>r.data)
export const readChat=s=>client.get(`/support/chats/${s.id}`,auth(s.token)).then(r=>r.data)
export const sendChat=(s,body)=>client.post(`/support/chats/${s.id}/messages`,body,auth(s.token)).then(r=>r.data)
export const closeChat=s=>client.post(`/support/chats/${s.id}/close`,{},auth(s.token))
export const staffChats=(status='open',offset=0)=>client.get('/ministry-admin/chats',{...auth(editorToken()),params:{status,offset}}).then(r=>r.data.threads)
export const staffReadChat=id=>client.get(`/ministry-admin/chats/${id}`,auth(editorToken())).then(r=>r.data)
export const staffSendChat=(id,body)=>client.post(`/ministry-admin/chats/${id}/messages`,body,auth(editorToken())).then(r=>r.data)
export const staffCloseChat=id=>client.post(`/ministry-admin/chats/${id}/close`,{},auth(editorToken()))
export const setChatPresence=available=>client.post('/ministry-admin/chat/presence',{available},auth(editorToken()))
export const readSecurity=()=>client.get('/ministry-admin/security',auth(editorToken())).then(r=>r.data)
export function newChatSession(){const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);return {id:crypto.randomUUID(),token:Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')}}
export const CHAT_SESSION='crhSupportChatV1'
export function savedChat(){try{const s=JSON.parse(sessionStorage.getItem(CHAT_SESSION)||'null');return /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(s?.id||'')&&/^[a-f0-9]{64}$/.test(s?.token||'')?s:null}catch{return null}}
