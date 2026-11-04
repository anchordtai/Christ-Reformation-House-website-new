import axios from 'axios'
const api=axios.create({baseURL:import.meta.env.PROD?'https://christ-reformation-house-website-new-1.onrender.com/api':(import.meta.env.VITE_API_URL||'/api'),timeout:25000})
const key='crhCommunicationToken'
export const communicationToken=()=>sessionStorage.getItem(key)||''
export const communicationSignOut=()=>sessionStorage.removeItem(key)
export async function communicationLogin(email,password){const {data}=await api.post('/communications/login',{email,password});sessionStorage.setItem(key,data.token);return data}
export const publicCommunication=async(path,body)=>(body===undefined?await api.get('/communications/'+path):await api.post('/communications/'+path,body)).data
export const staffCommunication=async(path='',body)=>{const config={headers:{Authorization:'Bearer '+communicationToken()}};return(body===undefined?await api.get('/ministry-admin/communications'+path,config):await api.post('/ministry-admin/communications'+path,body,config)).data}
export const communicationError=e=>e.response?.data?.error||'Unable to connect. Please try again.'
