import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

const navLinks = [
  { path: '/', label: 'Home' }, { path: '/about', label: 'About' },
  { path: '/watch', label: 'Watch' }, { path: '/devotional', label: 'Devotional' },
  { path: '/salvation', label: 'New here?' },
  { path: '/testimonies', label: 'Testimonies' }, { path: '/meetings', label: 'Meetings' },
  { path: '/donate', label: 'Give' }, { path: '/contact', label: 'Contact' },
]
export default function Header() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  const active = path => path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(path + '/')
  const links = navLinks.map(link => <Link key={link.path} to={link.path} aria-current={active(link.path) ? 'page' : undefined} onClick={() => setOpen(false)}>{link.label}</Link>)
  return <header className="platform-header sticky top-0 z-50"><div className="container-custom px-4"><div className="flex items-center justify-between h-20 gap-5">
    <Link to="/" className="platform-brand"><img src="/assets/img/crhlogo.jpg" alt="Christ's Reformation House Logo" width="48" height="48" /><span><strong>Christ's Reformation House</strong><small>International</small></span></Link>
    <nav aria-label="Main navigation" className="platform-nav hidden xl:flex">{links}</nav>
    <button type="button" onClick={() => setOpen(value => !value)} className="xl:hidden p-3 rounded-lg" aria-label="Toggle menu" aria-expanded={open} aria-controls="mobile-navigation">{open ? <X size={24} /> : <Menu size={24} />}</button>
  </div>{open && <nav id="mobile-navigation" aria-label="Mobile navigation" className="platform-nav platform-mobile-nav xl:hidden">{links}</nav>}</div></header>
}
