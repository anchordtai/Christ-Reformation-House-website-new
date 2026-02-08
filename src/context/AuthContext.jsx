import { createContext, useContext, useState, useEffect, useCallback } from 'react'

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
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null)
  const [loading, setLoading] = useState(true)

  const login = useCallback((newToken, userData) => {
    if (newToken) localStorage.setItem(TOKEN_KEY, newToken)
    setToken(newToken || null)
    if (userData) {
      sessionStorage.setItem(USER_KEY, JSON.stringify(userData))
      setUser(userData)
    }
  }, [])

  const logout = useCallback(() => {
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
    // Optional: validate token / fetch current user from API
    setLoading(false)
  }, [token])

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
