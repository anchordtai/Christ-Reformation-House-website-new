import { ScriptureContent } from './ScriptureText'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { getEvents } from '../services/ministry'
import { crusadeSlides, decemberCrusade, findCrusadeEvent } from '../content/december-crusade.mjs'
import '../styles/hero-carousel.css'

const ministrySlides = [
  { image: '/assets/portraits/ministering-pink.webp', alt: 'Portrait of Apostle (Dr) Anchord Taiwo ministering with a microphone in a pink suit', label: 'Grow in the Word', text: 'Discover teaching that encourages faith and points you to Christ.', link: '/sermons', action: 'Explore messages' },
  { image: '/assets/portraits/ministering-orange.webp', alt: 'Portrait of Apostle (Dr) Anchord Taiwo holding a microphone and laying a hand on an adult’s head in prayer', label: 'A community of prayer', text: 'Take your next step in faith, prayer, and fellowship with our ministry.', link: '/prayer-request', action: 'Share a prayer request' },
]

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(() => document.visibilityState === 'hidden')
  const [reducedMotion, setReducedMotion] = useState(() => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches))
  const [now, setNow] = useState(Date.now)
  const [event, setEvent] = useState(null)
  const [failedMedia, setFailedMedia] = useState({})
  const gesture = useRef(null)
  const campaignActive = now < decemberCrusade.endsAt
  const slides = campaignActive ? [...crusadeSlides, ...ministrySlides] : ministrySlides
  const index = current % slides.length, slide = slides[index]
  const isCrusade = campaignActive && index < crusadeSlides.length
  useEffect(() => {
    let active = true
    getEvents().then(events => { if (active) setEvent(findCrusadeEvent(events)) }).catch(() => {})
    return () => { active = false }
  }, [])
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const motion = () => setReducedMotion(Boolean(query?.matches))
    const visibility = () => setHidden(document.visibilityState === 'hidden')
    const clock = setInterval(() => setNow(Date.now()), 60000)
    query?.addEventListener('change', motion)
    document.addEventListener('visibilitychange', visibility)
    return () => { clearInterval(clock); query?.removeEventListener('change', motion); document.removeEventListener('visibilitychange', visibility) }
  }, [])
  useEffect(() => {
    if (paused || hovered || focused || hidden || reducedMotion) return
    const timer = setTimeout(() => setCurrent(value => (value + 1) % slides.length), 7000)
    return () => clearTimeout(timer)
  }, [current, slides.length, paused, hovered, focused, hidden, reducedMotion])
  useEffect(() => {
    const nextImage = new window.Image()
    const next = slides[(index + 1) % slides.length]
    nextImage.src = window.innerWidth < 768 && next.smallImage ? next.smallImage : next.image
  }, [index, campaignActive])
  const select = value => { setCurrent((value + slides.length) % slides.length) }
  const registrationOpen = event?.registration_enabled && Date.parse(event.ends_at) > now
  return <ScriptureContent><section className={`ministry-hero ${isCrusade ? 'crusade-hero' : ''}`} aria-roledescription="carousel" aria-label="Welcome to Christ’s Reformation House"
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={e => { if (e.target.matches(':focus-visible')) setFocused(true) }}
    onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false) }}
    onTouchStart={e => { const touch = e.touches[0]; gesture.current = { x: touch.clientX, y: touch.clientY } }}
    onTouchCancel={() => { gesture.current = null }}
    onTouchEnd={e => {
      const start = gesture.current; gesture.current = null
      if (!start || e.target.closest('button, a')) return
      const touch = e.changedTouches[0], dx = touch.clientX - start.x, dy = touch.clientY - start.y
      if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.25) select(index + (dx < 0 ? 1 : -1))
    }}
    onKeyDown={e => {
      if (e.target.closest('input, textarea, select')) return
      if (e.key === 'ArrowLeft') { e.preventDefault(); select(index - 1) }
      if (e.key === 'ArrowRight') { e.preventDefault(); select(index + 1) }
    }}>
    <div className="ministry-hero-inner"><div className="ministry-hero-copy">
      <p className="ministry-eyebrow">{isCrusade ? 'DECEMBER FIRE CRUSADE 2026' : 'Christ’s Reformation House International'}</p>
      <h1>{isCrusade ? <><span className="hero-title-line">GOD OF</span><span className="hero-title-line hero-title-accent">WONDER</span></> : <><span className="hero-title-line">Rooted in Christ.</span><span className="hero-title-line hero-title-accent">Connected across nations.</span></>}</h1>
      <div className="hero-values" aria-label="Our invitation">{(isCrusade ? ['Prayer', 'Worship', 'Revival'] : ['Worship', 'Grow', 'Belong']).map(value => <span key={value}>{value}</span>)}</div>
      <p className="ministry-hero-intro">{isCrusade ? decemberCrusade.message : 'A place to grow in faith, find fellowship, and take part in God’s work—wherever you call home.'}</p>
      {isCrusade ? <div className="crusade-details"><strong>{decemberCrusade.dates}</strong><p>{decemberCrusade.time}</p><p>{decemberCrusade.venue}<br />{decemberCrusade.address}</p><p className="crusade-scripture">Psalm 77:14</p></div> : <div className="ministry-slide-copy" aria-live={paused || focused || reducedMotion ? 'polite' : 'off'} aria-atomic="true"><p className="font-semibold text-amber-300">{slide.label}</p><p className="mt-2 text-slate-300">{slide.text}</p></div>}
      <div className="ministry-actions">{isCrusade ? <>
        {registrationOpen ? <Link to={`/events/register/${event.id}`} className="ministry-button">REGISTER TO ATTEND<ArrowRight size={18} /></Link> : <button className="ministry-button" disabled>REGISTER TO ATTEND</button>}
        <Link to="/watch#broadcast" className="ministry-button-outline">WATCH ONLINE</Link>
      </> : <><Link to={slide.link} className="ministry-button">{slide.action}<ArrowRight size={18} /></Link><Link to="/about" className="ministry-button-outline">Meet the ministry</Link></>}</div>
      {isCrusade && <p className="crusade-availability">{registrationOpen ? 'Free event registration is open.' : 'Online registration opens when the ministry publishes this gathering.'} The crusade begins on 7 December. Broadcast details will appear on our Watch page.</p>}
      <div className="ministry-controls">
        <button type="button" onClick={() => select(index - 1)} aria-label="Previous ministry slide"><ChevronLeft size={20} /></button>
        {slides.map((item, i) => <button key={item.image} type="button" onClick={() => select(i)} aria-label={`Show slide ${i + 1}: ${item.label}`} aria-pressed={index === i} className="ministry-slide-dot"><span /></button>)}
        <button type="button" onClick={() => select(index + 1)} aria-label="Next ministry slide"><ChevronRight size={20} /></button>
        {!reducedMotion && <button type="button" onClick={() => { setPaused(value => !value); setFocused(false) }} aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}>{paused ? <Play size={18} /> : <Pause size={18} />}</button>}
        <span className="hero-slide-count" aria-hidden="true">{index + 1} / {slides.length}</span>
      </div>
    </div><figure className="ministry-hero-visual">
      {slides.map((item, i) => <div key={item.image} className={`ministry-hero-slide ${i === index ? 'is-active' : ''} ${item.artwork ? 'hero-artwork' : ''}`} aria-hidden={i !== index} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}`}>
        <img src={failedMedia[item.image] ? '/assets/img/crhlogo.jpg' : item.image} srcSet={!failedMedia[item.image] && item.smallImage ? `${item.smallImage} 960w, ${item.image} 1672w` : undefined} sizes="(max-width: 767px) 100vw, 55vw" alt={item.alt} width={isCrusade ? 1672 : 933} height={isCrusade ? 941 : 1400} loading={i === 0 ? 'eager' : 'lazy'} fetchpriority={i === 0 ? 'high' : 'low'} decoding="async" onError={() => { if (!failedMedia[item.image]) setFailedMedia(value => ({ ...value, [item.image]: true })) }} />
      </div>)}
      <figcaption>{failedMedia[slide.image] ? 'Media is unavailable. The event details remain available here.' : slide.illustration ? 'Illustrative prayer scene · December Fire Crusade 2026' : isCrusade ? 'Come and experience the power of God!' : 'Apostle (Dr) Anchord Taiwo'}<span>{isCrusade ? decemberCrusade.venue : 'Senior Pastor · Christ’s Reformation House International'}</span></figcaption>
    </figure></div>
  </section></ScriptureContent>
}
