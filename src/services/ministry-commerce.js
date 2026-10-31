import axios from 'axios'
import {editorToken} from './devotionals'
const baseURL=(import.meta.env.PROD?'https://christ-reformation-house-website-new-1.onrender.com/api':(import.meta.env.VITE_API_URL||'/api')).replace(/\/$/,'')
const client=axios.create({baseURL,timeout:25000})
const staff=()=>({headers:{Authorization:`Bearer ${editorToken()||''}`}})
const owner=token=>({headers:{Authorization:`Bearer ${token}`}})
export const commerceError=e=>e.response?.data?.error||'Unable to connect. Keep your reference and retry safely.'
export const sendContact=body=>client.post('/contact',body).then(r=>r.data)
export const readContact=(offset=0)=>client.get('/ministry-admin/contact',{...staff(),params:{offset}}).then(r=>r.data.messages)
export const updateContact=(id,status)=>client.post(`/ministry-admin/contact/${id}`,{status},staff())
export const readStore=()=>client.get('/store/products').then(r=>r.data)
export const createStoreOrder=body=>client.post('/store/orders',body).then(r=>r.data.order)
export const readStoreOrder=(id,token)=>client.get(`/store/orders/${id}`,owner(token)).then(r=>r.data.order)
export const storeOrderAction=(session,action)=>client.post(`/store/orders/${session.id}/${action}`,{},owner(session.token)).then(r=>r.data.order)
export const editStoreProducts=()=>client.get('/ministry-admin/store/products',staff()).then(r=>r.data.products)
export const saveStoreProduct=body=>client.post('/ministry-admin/store/products',body,staff()).then(r=>r.data.product)
export const editStoreOrders=(offset=0)=>client.get('/ministry-admin/store/orders',{...staff(),params:{offset}}).then(r=>r.data.orders)
export const staffStoreAction=(id,action)=>client.post(`/ministry-admin/store/orders/${id}/${action}`,{},staff())
export const naira=minor=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN'}).format(Number(minor)/100)
