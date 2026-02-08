import axios from 'axios'

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for adding auth tokens
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || ''
      // Don't redirect to login for public endpoints (donation) or for login/signup (avoids redirect loop)
      const isPublicOrAuth =
        url.includes('/donations') ||
        url.includes('/auth/login') ||
        url.includes('/auth/signup')
      if (!isPublicOrAuth) {
        localStorage.removeItem('authToken')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// API endpoints
export const sermonService = {
  getAll: () => api.get('/sermons'),
  getById: (id) => api.get(`/sermons/${id}`),
  search: (query) => api.get(`/sermons/search?q=${query}`),
}

export const eventService = {
  getAll: () => api.get('/events'),
  getById: (id) => api.get(`/events/${id}`),
  register: (eventId, data) => api.post(`/events/${eventId}/register`, data),
  search: (query) => api.get(`/events/search?q=${query}`),
}

export const blogService = {
  getAll: () => api.get('/blog'),
  getById: (id) => api.get(`/blog/${id}`),
  search: (query) => api.get(`/blog/search?q=${query}`),
}

export const devotionalService = {
  getByDate: (date) => api.get(`/devotionals?date=${date}`),
  getAll: () => api.get('/devotionals'),
}

export const donationService = {
  create: (data) => api.post('/donations', data),
  verify: (transactionId, txRef) =>
    api.post('/donations/verify', { transaction_id: transactionId, tx_ref: txRef }),
}

export const prayerService = {
  create: (data) => api.post('/prayer-requests', data),
  getAll: () => api.get('/prayer-requests'),
}

export const contactService = {
  send: (data) => api.post('/contact', data),
}

export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  signup: (data) => api.post('/auth/signup', data),
  logout: () => {
    localStorage.removeItem('authToken')
    return Promise.resolve()
  },
  getCurrentUser: () => api.get('/auth/me'),
}

export const storeService = {
  getProducts: () => api.get('/store/products'),
  getProductById: (id) => api.get(`/store/products/${id}`),
  createOrder: (data) => api.post('/store/orders', data),
}

// Live stream: status + Facebook comments (backend proxies Graph API for security)
export const liveStreamService = {
  getStatus: () => api.get('/live/status'),
  getComments: (videoId) => api.get(`/live/comments/${videoId}`),
}

// Payment: initiate with chosen gateway (backend returns redirect URL or client secret)
export const paymentService = {
  createIntent: (data) => api.post('/payments/create', data),
  verify: (reference) => api.post('/payments/verify', { reference }),
}

// Meetings & scheduling (Teams-style: CRUD, tokens, invites)
export const meetingsService = {
  getAll: (params) => api.get('/meetings', { params }),
  getById: (id) => api.get(`/meetings/${id}`),
  create: (data) => api.post('/meetings', data),
  update: (id, data) => api.patch(`/meetings/${id}`, data),
  cancel: (id, reason) => api.post(`/meetings/${id}/cancel`, { reason }),
  sendInvites: (meetingId, emails) => api.post(`/meetings/${meetingId}/invites`, { emails }),
  getJoinUrl: (meetingId, token) =>
    api.get(`/meetings/${meetingId}/join`, token ? { params: { token } } : {}),
  getJoinUrlWithToken: (meetingId, joinToken) =>
    api.get(`/meetings/${meetingId}/join`, { params: { token: joinToken } }),
}

// Social automation (admin: trigger post; backend uses stored tokens)
export const socialAutomationService = {
  postNow: (payload) => api.post('/social/post', payload),
  getScheduled: () => api.get('/social/scheduled'),
}

export default api




