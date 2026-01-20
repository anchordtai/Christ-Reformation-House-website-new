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
      // Handle unauthorized - clear token and redirect to login
      localStorage.removeItem('authToken')
      window.location.href = '/login'
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
  verify: (transactionId) => api.post('/donations/verify', { transaction_id: transactionId }),
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

export default api




