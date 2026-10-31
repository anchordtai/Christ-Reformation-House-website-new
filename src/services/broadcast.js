import axios from 'axios'
import {editorToken} from './devotionals'
const baseURL=(import.meta.env.PROD?'https://christ-reformation-house-website-new-1.onrender.com/api':(import.meta.env.VITE_API_URL||'/api')).replace(/\/$/,'')
const client=axios.create({baseURL,timeout:20000})
const staff=()=>({headers:{Authorization:`Bearer ${editorToken()||''}`}})
export const readBroadcast=signal=>client.get('/live-broadcast',{signal}).then(r=>r.data.broadcast)
export const editBroadcast=()=>client.get('/ministry-admin/live-broadcast',staff()).then(r=>r.data.broadcast)
export const saveBroadcast=body=>client.post('/ministry-admin/live-broadcast',body,staff()).then(r=>r.data.broadcast)
