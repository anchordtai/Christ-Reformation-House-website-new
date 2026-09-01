import axios from 'axios'

// Production must always use the current Render backend. This prevents a stale
// VITE_API_URL in Netlify from sending production payment requests to an old host.
const PRODUCTION_API_BASE_URL = 'https://christ-reformation-house-website-new-1.onrender.com/api'
const configuredApiUrl = (import.meta.env.VITE_API_URL || '').trim()
const API_BASE_URL = (import.meta.env.PROD ? PRODUCTION_API_BASE_URL : (configuredApiUrl || PRODUCTION_API_BASE_URL)).replace(/\/$/, '')

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || ''
      const isPublicOrAuth = url.includes('/donations') || url.includes('/payments/') || url.includes('/auth/login') || url.includes('/auth/signup')
      if (!isPublicOrAuth) {
        localStorage.removeItem('authToken')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export const sermonService = {
  getAll: () => api.get('/sermons'),
  getById: (id) => api.get(`/sermons/${id}`),
  search: (query) => api.get(`/sermons/search?q=${encodeURIComponent(query)}`),
}
export const eventService = {
  getAll: () => api.get('/events'),
  getById: (id) => api.get(`/events/${id}`),
  register: (eventId, data) => api.post(`/events/${eventId}/register`, data),
  search: (query) => api.get(`/events/search?q=${encodeURIComponent(query)}`),
}
export const blogService = {
  getAll: () => api.get('/blog'),
  getById: (id) => api.get(`/blog/${id}`),
  search: (query) => api.get(`/blog/search?q=${encodeURIComponent(query)}`),
}
export const devotionalService = {
  getByDate: (date) => api.get(`/devotionals?date=${encodeURIComponent(date)}`),
  getAll: () => api.get('/devotionals'),
}

export const donationService = {
  create: (data) => api.post('/donations', data),
  initialize: (txRef, paymentMethod) => api.post('/payments/initialize', { tx_ref: txRef, paymentMethod }),
  verify: (txRef) => api.get(`/payments/verify/${encodeURIComponent(txRef)}`),
  getConfig: () => api.get('/payments/config'),
}

export const prayerService = { create: (data) => api.post('/prayer-requests', data), getAll: () => api.get('/prayer-requests') }
export const contactService = { send: (data) => api.post('/contact', data) }
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  signup: (data) => api.post('/auth/signup', data),
  logout: () => { localStorage.removeItem('authToken'); return Promise.resolve() },
  getCurrentUser: () => api.get('/auth/me'),
}
export const storeService = {
  getProducts: () => api.get('/store/products'),
  getProductById: (id) => api.get(`/store/products/${id}`),
  createOrder: (data) => api.post('/store/orders', data),
}
export const liveStreamService = {
  getStatus: () => api.get('/live/status'),
  getComments: (videoId) => api.get(`/live/comments/${encodeURIComponent(videoId)}`),
}
export const paymentService = {
  createIntent: (data) => api.post('/payments/initialize', data),
  verify: (txRef) => api.get(`/payments/verify/${encodeURIComponent(txRef)}`),
}
export const meetingsService = {
  getAll: (params) => api.get('/meetings', { params }),
  getById: (id) => api.get(`/meetings/${id}`),
  create: (data) => api.post('/meetings', data),
  update: (id, data) => api.patch(`/meetings/${id}`, data),
  cancel: (id, reason) => api.post(`/meetings/${id}/cancel`, { reason }),
  sendInvites: (meetingId, emails) => api.post(`/meetings/${meetingId}/invites`, { emails }),
  getJoinUrl: (meetingId, token) => api.get(`/meetings/${meetingId}/join`, token ? { params: { token } } : {}),
  getJoinUrlWithToken: (meetingId, joinToken) => api.get(`/meetings/${meetingId}/join`, { params: { token: joinToken } }),
}
export const socialAutomationService = { postNow: (payload) => api.post('/social/post', payload), getScheduled: () => api.get('/social/scheduled') }

export default api
