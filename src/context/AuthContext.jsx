import { createContext, useContext, useState, useEffect, useCallback } from 'react'

import { authService } from '../services/api'

const AuthContext = createContext(null)

const TOKEN_KEY = 'authToken'
const USER_KEY = 'authUser'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem(USER_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || null)
  const [loading, setLoading] = useState(true)

  const login = useCallback((newToken, userData) => {
    if (newToken) sessionStorage.setItem(TOKEN_KEY, newToken)
    setToken(newToken || null)
    if (userData) {
      sessionStorage.setItem(USER_KEY, JSON.stringify(userData))
      setUser(userData)
    }
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    authService.getCurrentUser().then(({ data }) => {
      if (!active) return
      setUser(data); sessionStorage.setItem(USER_KEY, JSON.stringify(data))
    }).catch(() => { if (active) logout() }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }

  }, [token, logout])

  const isAdmin = !!user && (user.role === 'admin' || user.isAdmin === true)

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    isAdmin,
    loading,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

