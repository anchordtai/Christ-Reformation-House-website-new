import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Heart, MessageCircle, Send, X, ArrowUpRight } from 'lucide-react'
import { guideReply } from '../utils/ministry-guide.mjs'

export default function MinistryAssistant() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([{ role: 'assistant', ...guideReply() }])
  const toggle = useRef(null)
  const field = useRef(null)
  const end = useRef(null)
  const hidden = pathname.startsWith('/admin') || pathname.startsWith('/support') || pathname.startsWith('/donate') || pathname.startsWith('/store') || pathname.startsWith('/meetings/room/')
  useEffect(() => { setOpen(false); setInput('') }, [pathname])
  useEffect(() => { if (open && !hidden) field.current?.focus() }, [open, hidden])
  useEffect(() => { end.current?.scrollIntoView?.({ block: 'nearest' }) }, [messages])
  useEffect(() => {
    if (!open) return
    const escape = event => { if (event.key === 'Escape') { setOpen(false); toggle.current?.focus() } }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [open])
  function ask(value) {
    const text = value.trim().slice(0, 500)
    if (!text) return
    setMessages(current => [...current.slice(-8), { role: 'visitor', text }, { role: 'assistant', ...guideReply(text) }])
    setInput('')
  }
  if (hidden) return null
  return <>
    <Link className="floating-give" to="/donate" aria-label="Give to support the ministry"><Heart size={18} /><span>Give</span></Link>
    <button ref={toggle} type="button" className="ministry-chat-toggle" aria-expanded={open} aria-controls="ministry-guide" aria-label={open ? 'Close ministry assistant' : 'Open ministry assistant'} onClick={() => setOpen(value => !value)}>{open ? <X size={22} /> : <MessageCircle size={22} />}<span>{open ? 'Close' : 'Need help?'}</span></button>
    {open && <div id="ministry-guide" className="ministry-chat" role="dialog" aria-modal="false" aria-labelledby="guide-title">
      <header><div className="guide-avatar"><MessageCircle size={22} /></div><div><h2 id="guide-title">Your ministry guide</h2><p>Prepared answers · Staff chat available separately</p></div><button type="button" aria-label="Close chat panel" onClick={() => { setOpen(false); toggle.current?.focus() }}><X size={19} /></button></header>
      <div className="guide-messages" role="log" aria-live="polite" aria-relevant="additions">{messages.map((message, index) => <div key={index} className={`guide-message ${message.role}`}><p>{message.text}</p>{message.links && <div className="guide-links">{message.links.map(link => link.external ? <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">{link.label}<ArrowUpRight size={14} /></a> : <Link key={link.href} to={link.href} onClick={() => setOpen(false)}>{link.label}<ArrowUpRight size={14} /></Link>)}</div>}</div>)}<div ref={end} /></div>
      <div className="guide-links" style={{padding:"12px 18px"}}><Link to="/help" onClick={()=>setOpen(false)}>Search church help →</Link><Link to="/support" onClick={()=>setOpen(false)}>Chat with church staff →</Link></div><div className="guide-suggestions">{['Prayer', 'Salvation', 'Meetings', 'Giving', 'Service time'].map(topic => <button type="button" key={topic} onClick={() => ask(topic)}>{topic}</button>)}</div>
      <form onSubmit={event => { event.preventDefault(); ask(input) }}><label className="sr-only" htmlFor="ministry-question">Ask the ministry guide</label><input ref={field} id="ministry-question" value={input} onChange={event => setInput(event.target.value)} maxLength={500} placeholder="How can we help you?" autoComplete="off" /><button type="submit" aria-label="Send question" disabled={!input.trim()}><Send size={19} /></button></form>
      <p className="guide-privacy">This guide uses prepared answers. Your chat isn’t sent to the ministry or saved. Avoid sharing private details.</p>
    </div>}
  </>
}

