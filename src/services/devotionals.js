import axios from 'axios'
const baseURL = (import.meta.env.PROD ? 'https://christ-reformation-house-website-new-1.onrender.com/api' : (import.meta.env.VITE_API_URL || '/api')).replace(/\/$/,'')
const client = axios.create({ baseURL, timeout:20000 })
const TOKEN_KEY = 'crhDevotionalEditorToken'
export const editorToken = () => sessionStorage.getItem(TOKEN_KEY)
export const signOutEditor = () => sessionStorage.removeItem(TOKEN_KEY)
export async function editorLogin(email,password) {
  const { data } = await client.post('/devotional-editor/login',{email,password})
  sessionStorage.setItem(TOKEN_KEY,data.token)
}
const auth = () => ({ headers:{ Authorization:`Bearer ${editorToken() || ''}` } })
export const listDrafts = () => client.get('/devotional-editor/entries',auth())
export const saveEntry = (date,body) => client.post(`/devotional-editor/entries/${encodeURIComponent(date)}`,body,auth())
export const readDevotionals = params => client.get('/devotionals',{ params })
export const devotionalError = e => e.response?.data?.error || 'Unable to connect. Please try again.'
export function nigeriaToday() { return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()) }
