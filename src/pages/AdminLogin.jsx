import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, Shield, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { authService } from '../services/api'

export default function AdminLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated, isAdmin } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const from = location.state?.from?.pathname || '/live'

  // Already admin: redirect to intended page
  if (isAuthenticated && isAdmin) {
    navigate(from, { replace: true })
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      const res = await authService.login(formData)
      const token = res?.data?.token
      const user = res?.data?.user
      if (!token || !user) {
        setError(res?.data?.message || 'Invalid credentials')
        return
      }
      const admin = user.role === 'admin' || user.isAdmin === true
      if (!admin) {
        setError("Access denied. This area is for administrators only.")
        return
      }
      login(token, user)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Sign in failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 section-padding">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 mb-4 ring-2 ring-indigo-500/30">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Admin sign in</h1>
          <p className="text-slate-400 text-sm">Sign in with your administrator account</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl shadow-xl p-6 sm:p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="admin-email" className="block text-sm font-medium text-slate-300 mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                <input
                  type="email"
                  id="admin-email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="admin@church.org"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                <input
                  type="password"
                  id="admin-password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
            >
              {isLoading ? (
                <span className="animate-pulse">Signing in...</span>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700 text-center">
            <Link
              to="/"
              className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
            >
              ← Back to site
            </Link>
            <span className="text-slate-600 mx-2">·</span>
            <Link
              to="/login"
              className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
            >
              Member login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
