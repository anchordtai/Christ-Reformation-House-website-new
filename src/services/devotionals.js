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
export const readDevotionalArchive = params => client.get('/devotionals/archive',{params})
export const devotionalError = e => e.response?.data?.error || 'Unable to connect. Please try again.'
export function nigeriaToday() { return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()) }

export async function requestEditorPassword(email) {
  const { data } = await client.post('/devotional-editor/password-reset', { email })
  return data.message
}
export async function setEditorPassword(token, password) {
  const { data } = await client.post('/devotional-editor/password', { password }, { headers:{ Authorization:`Bearer ${token}` } })
  return data.message
}

export function devotionalVisitor() {
  const key = 'crhDevotionalVisitor'
  let value = localStorage.getItem(key)
  if (!/^[a-f0-9]{64}$/.test(value || '')) {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    value = Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')
    localStorage.setItem(key,value)
  }
  return value
}
const visitorHeaders = value => value ? { 'X-Devotional-Visitor':value } : {}
export const readCommunity = (date,visitor,offset=0) => client.get(`/devotionals/${encodeURIComponent(date)}/community`,{headers:visitorHeaders(visitor),params:{offset}})
export const likeDevotional = (date,visitor,liked) => client.post(`/devotionals/${encodeURIComponent(date)}/like`,{liked},{headers:visitorHeaders(visitor)})
export const commentOnDevotional = (date,visitor,body) => client.post(`/devotionals/${encodeURIComponent(date)}/comments`,body,{headers:visitorHeaders(visitor)})
export const moderateComments = (status='pending',offset=0) => client.get('/devotional-editor/comments',{...auth(),params:{status,offset}})
export const reviewComment = (id,status,expectedStatus) => client.post(`/devotional-editor/comments/${encodeURIComponent(id)}/review`,{status,expectedStatus},auth())


export const publicationOverview=()=>client.get('/devotional-publication').then(r=>r.data)
export const publicationCalendar=month=>client.get('/devotional-publication/calendar/'+month).then(r=>r.data)
export const translatedReading=(date,language)=>client.get('/devotional-publication/reading/'+date,{params:{language}}).then(r=>r.data)
export const publicationDesk=month=>client.get('/devotional-editor/publication',{...auth(),params:{month}}).then(r=>r.data)
export const saveEdition=body=>client.post('/devotional-editor/publication/editions',body,auth()).then(r=>r.data)
export const saveDevotionalTranslation=(date,language,body)=>client.post('/devotional-editor/publication/translations/'+date+'/'+language,body,auth()).then(r=>r.data)
export async function downloadPublication(month,language='en',staff=false,format='pdf',date){
 const url=staff?'/devotional-editor/publication/'+(format==='pdf'?'pdf/':'export/')+month:'/devotional-publication/pdf/'+month
 const r=await client.get(url,{...(staff?auth():{}),params:{language,format,date},responseType:'blob'})
 const link=document.createElement('a');link.href=URL.createObjectURL(r.data);link.download='unleash-'+(date||month)+'-'+language+'.'+format;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)
}
export const countDevotionalOpen=date=>client.post('/devotional-publication/open/'+date,{analyticsConsent:true})
