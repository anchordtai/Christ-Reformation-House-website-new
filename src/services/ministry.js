import axios from 'axios'
import { editorToken } from './devotionals'
const baseURL = (import.meta.env.PROD ? 'https://christ-reformation-house-website-new-1.onrender.com/api' : (import.meta.env.VITE_API_URL || '/api')).replace(/\/$/,'')
const client = axios.create({baseURL,timeout:20000})
export const ministryError = error => error.response?.data?.error || 'Unable to connect. Please try again.'
const staff = () => ({headers:{Authorization:`Bearer ${editorToken() || ''}`}})
export const getEvents = () => client.get('/events').then(r=>Array.isArray(r.data)?r.data:(r.data.events || []))
export const getEvent = id => client.get(`/events/${encodeURIComponent(id)}`).then(r=>r.data.event)
export const registerEvent = (id,input) => client.post(`/events/${encodeURIComponent(id)}/register`,input).then(r=>r.data)
export const editEvents = () => client.get('/ministry-admin/events',staff()).then(r=>r.data.events)
export const saveEvent = event => client.post('/ministry-admin/events',event,staff()).then(r=>r.data.event)
export const eventRegistrations = (id,offset=0) => client.get(`/ministry-admin/events/${encodeURIComponent(id)}/registrations`,{...staff(),params:{offset}}).then(r=>r.data.registrations)
// The old backend has no config route. Preserve its public-Jitsi flow while
// frontend/backend automatic deployments roll out at different speeds.
export const meetingConfig = () => client.get('/meeting-provider/config').then(r=>r.data).catch(error=>{if(error.response?.status===404)return {embedded:false,provider:'public'};throw error})
const HOST_KEY = 'crhMeetingHostSession'
export function hostSession() { try { return JSON.parse(sessionStorage.getItem(HOST_KEY) || 'null') } catch { return null } }
export const signOutHost = () => sessionStorage.removeItem(HOST_KEY)
function rememberHost(session) { sessionStorage.setItem(HOST_KEY,JSON.stringify(session)); return session }
export const hostLogin = (email,password) => client.post('/meeting-host/login',{email,password}).then(r=>rememberHost(r.data))
let refreshing
async function hostToken() {
  let session = hostSession()
  if (!session) throw new Error('Sign in as host.')
  if (session.expiresAt <= Date.now()+60000) {
    if (!refreshing) refreshing = client.post('/meeting-host/refresh',{refreshToken:session.refreshToken}).then(r=>rememberHost(r.data)).catch(error=>{signOutHost();throw error}).finally(()=>{refreshing=null})
    session = await refreshing
  }
  return session.token
}
export async function joinEmbeddedMeeting(input) {
  const token = input.host ? await hostToken() : null
  return client.post('/meeting-provider/join',input,token ? {headers:{Authorization:`Bearer ${token}`}} : {}).then(r=>r.data)
}
