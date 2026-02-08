import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()
  const { isAdmin } = useAuth()

  const isActive = (path) => location.pathname === path

  const allNavLinks = [
    { path: '/', label: 'Home' },
    { path: '/about', label: 'About' },
    { path: '/sermons', label: 'Sermons' },
    { path: '/live', label: 'Live', adminOnly: true },
    { path: '/events', label: 'Events' },
    { path: '/devotional', label: 'Devotional' },
    { path: '/blog', label: 'Blog' },
    { path: '/ministries', label: 'Ministries' },
    { path: '/meetings', label: 'Meetings' },
    { path: '/donate', label: 'Give' },
    { path: '/contact', label: 'Contact' },
  ]
  const navLinks = allNavLinks.filter((link) => !link.adminOnly || isAdmin)

  return (
    <header className="bg-white/95 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-gray-100">
      <div className="container-custom">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <img 
                src="/assets/img/crhlogo.jpg" 
                alt="Christ's Reformation House Logo" 
                className="h-12 w-12 rounded-full object-cover ring-2 ring-blue-500/20 group-hover:ring-blue-500/50 transition-all duration-300 transform group-hover:scale-110"
              />
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/20 group-hover:to-purple-500/20 transition-all duration-300"></div>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                Christ's Reformation House
              </h1>
              <p className="text-xs text-gray-600 group-hover:text-blue-500 transition-colors duration-300">
                International
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`group relative px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  isActive(link.path)
                    ? 'text-white'
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                {/* Active Background */}
                {isActive(link.path) && (
                  <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg transform scale-105"></span>
                )}
                
                {/* Hover Background Effect */}
                {!isActive(link.path) && (
                  <span className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform scale-105"></span>
                )}
                
                {/* Text with gradient effect on hover */}
                <span className={`relative z-10 inline-block ${
                  isActive(link.path) 
                    ? 'text-white' 
                    : 'group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 group-hover:bg-clip-text group-hover:text-transparent'
                } transition-all duration-300 transform group-hover:scale-110`}>
                  {link.label}
                </span>
                
                {/* Underline effect */}
                {!isActive(link.path) && (
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 group-hover:w-full transition-all duration-300 rounded-full"></span>
                )}
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 rounded-lg transition-all duration-300 transform hover:scale-110"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="lg:hidden py-4 border-t animate-slide-down">
            <div className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`group relative px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
                    isActive(link.path)
                      ? 'text-white bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50'
                  } transform hover:scale-105 hover:translate-x-2`}
                >
                  <span className="relative z-10">{link.label}</span>
                  {!isActive(link.path) && (
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-600 to-purple-600 rounded-l-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  )}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}

export default Header
