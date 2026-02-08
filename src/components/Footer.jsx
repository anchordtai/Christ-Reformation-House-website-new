import { Link } from 'react-router-dom'
import { Facebook, Instagram, Youtube, Mail, Phone, MapPin, MessageCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { APP_CONFIG } from '../utils/constants'

const Footer = () => {
  const currentYear = new Date().getFullYear()
  const { isAdmin } = useAuth()

  const allQuickLinks = [
    { path: '/about', label: 'About Us' },
    { path: '/sermons', label: 'Sermons' },
    { path: '/live', label: 'Live', adminOnly: true },
    { path: '/events', label: 'Events' },
    { path: '/ministries', label: 'Ministries' },
    { path: '/blog', label: 'Blog' },
    { path: '/devotional', label: 'Devotional' },
    { path: '/meetings', label: 'Meetings' },
  ]
  const quickLinks = allQuickLinks.filter((link) => !link.adminOnly || isAdmin)

  const resources = [
    { path: '/donate', label: 'Give Online' },
    { path: '/prayer-request', label: 'Prayer Request' },
    { path: '/contact', label: 'Contact Us' },
    { path: '/store', label: 'Church Store' },
  ]

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container-custom section-padding">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About Section */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <img 
                src="/assets/img/crhlogo.jpg" 
                alt="Logo" 
                className="h-10 w-10 rounded-full object-cover"
              />
              <h3 className="text-white font-bold text-lg">Christ's Reformation House</h3>
            </div>
            <p className="text-sm mb-4">
              Where Faith Meets Transformation. Join us for worship, community, and spiritual growth in Christ.
            </p>
            <div className="flex space-x-4">
              <a href={APP_CONFIG.CHURCH_FACEBOOK} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors" aria-label="Facebook">
                <Facebook size={20} />
              </a>
              <a href={APP_CONFIG.CHURCH_INSTAGRAM} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors" aria-label="Instagram">
                <Instagram size={20} />
              </a>
              <a href={APP_CONFIG.CHURCH_TIKTOK} target="_blank" rel="noopener noreferrer" className="hover:text-gray-100 transition-colors" aria-label="TikTok">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88 6.24V19.4a7.37 7.37 0 0 0 4.07 1.13 7.33 7.33 0 0 0 6.83-7.25v-7a4.85 4.85 0 0 0 3.77 4.26V2h3.45v4.69h.01ZM12.92 19.4a2.92 2.92 0 0 1-2.92-2.92v-6.9a2.92 2.92 0 1 1 2.92 2.9v6.92Z"/>
                </svg>
              </a>
              <a href={APP_CONFIG.CHURCH_YOUTUBE || '#'} target="_blank" rel="noopener noreferrer" className="hover:text-red-400 transition-colors" aria-label="YouTube">
                <Youtube size={20} />
              </a>
              <a href={APP_CONFIG.CHURCH_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition-colors" aria-label="WhatsApp">
                <MessageCircle size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.path}>
                  <Link to={link.path} className="hover:text-blue-400 transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-white font-semibold mb-4">Resources</h4>
            <ul className="space-y-2">
              {resources.map((link) => (
                <li key={link.path}>
                  <Link to={link.path} className="hover:text-blue-400 transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-2">
                <MapPin size={18} className="mt-1 flex-shrink-0" />
                <span className="text-sm">{APP_CONFIG.CHURCH_ADDRESS}</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone size={18} className="flex-shrink-0" />
                <span className="text-sm">{APP_CONFIG.CHURCH_PHONE}</span>
              </li>
              <li className="flex items-center space-x-2">
                <Mail size={18} className="flex-shrink-0" />
                <a href={`mailto:${APP_CONFIG.CHURCH_EMAIL}`} className="text-sm hover:text-blue-400 transition-colors">{APP_CONFIG.CHURCH_EMAIL}</a>
              </li>
              <li className="flex items-center space-x-2">
                <MessageCircle size={18} className="flex-shrink-0" />
                <a href={APP_CONFIG.CHURCH_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="text-sm hover:text-green-400 transition-colors">WhatsApp: {APP_CONFIG.CHURCH_WHATSAPP}</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-sm">
            &copy; {currentYear} Christ's Reformation House International. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer




