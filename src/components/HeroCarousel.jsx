import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'

const slides = [
  { image: '/assets/portraits/ministering-pink.webp', alt: 'Portrait of Apostle (Dr) Anchord Taiwo ministering with a microphone in a pink suit', label: 'Grow in the Word', text: 'Discover teaching that encourages faith and points you to Christ.', link: '/sermons', action: 'Explore messages' },
  { image: '/assets/portraits/ministering-orange.webp', alt: 'Portrait of Apostle (Dr) Anchord Taiwo holding a microphone and laying a hand on an adult’s head in prayer', label: 'A community of prayer', text: 'Take your next step in faith, prayer, and fellowship with our ministry.', link: '/prayer-request', action: 'Share a prayer request' },
]
export default function HeroCarousel() {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [hidden, setHidden] = useState(() => document.visibilityState === 'hidden')
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false)
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const motion = () => setReducedMotion(Boolean(query?.matches))
    const visibility = () => setHidden(document.visibilityState === 'hidden')
    query?.addEventListener('change', motion)
    document.addEventListener('visibilitychange', visibility)
    return () => { query?.removeEventListener('change', motion); document.removeEventListener('visibilitychange', visibility) }
  }, [])
  useEffect(() => {
    if (paused || hovered || hidden || reducedMotion) return
    const timer = setInterval(() => setCurrent(index => (index + 1) % slides.length), 7000)
    return () => clearInterval(timer)
  }, [paused, hovered, hidden, reducedMotion])
  const select = index => { setCurrent((index + slides.length) % slides.length); setPaused(true) }
  return <section className="ministry-hero" aria-roledescription="carousel" aria-label="Welcome to Christ’s Reformation House" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setPaused(true)} onKeyDown={event => {
    if (event.target.tagName === 'INPUT') return
    if (event.key === 'ArrowLeft') { event.preventDefault(); select(current - 1) }
    if (event.key === 'ArrowRight') { event.preventDefault(); select(current + 1) }
  }}>
    <div className="ministry-hero-inner">
      <div className="ministry-hero-copy">
        <p className="ministry-eyebrow">Christ’s Reformation House International</p>
        <h1><span className="hero-title-line">Rooted in Christ.</span><span className="hero-title-line hero-title-accent">Connected across nations.</span></h1>
        <div className="hero-values" aria-label="Our invitation"><span>Worship</span><span>Grow</span><span>Belong</span></div>
        <p className="ministry-hero-intro">A place to grow in faith, find fellowship, and take part in God’s work—wherever you call home.</p>
        <div key={current} className="ministry-slide-copy" aria-live={paused || reducedMotion ? 'polite' : 'off'} aria-atomic="true"><p className="font-semibold text-amber-300">{slides[current].label}</p><p className="mt-2 text-slate-300">{slides[current].text}</p></div>
        <div className="ministry-actions"><Link to={slides[current].link} className="ministry-button">{slides[current].action}<ArrowRight size={18} /></Link><Link to="/about" className="ministry-button-outline">Meet the ministry</Link></div>
        <div className="ministry-controls">
          <button type="button" onClick={() => select(current - 1)} aria-label="Previous ministry slide"><ChevronLeft size={20} /></button>
          {slides.map((slide, index) => <button key={slide.image} type="button" onClick={() => select(index)} aria-label={`Show slide ${index + 1}: ${slide.label}`} aria-pressed={current === index} className="ministry-slide-dot"><span /></button>)}
          <button type="button" onClick={() => select(current + 1)} aria-label="Next ministry slide"><ChevronRight size={20} /></button>
          {!reducedMotion && <button type="button" onClick={() => setPaused(value => !value)} aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}>{paused ? <Play size={18} /> : <Pause size={18} />}</button>}
          <span className="ml-2 text-xs text-slate-400" aria-hidden="true">0{current + 1} / 0{slides.length}</span>
        </div>
      </div>
      <figure className="ministry-hero-visual">
        {slides.map((slide, index) => <div key={slide.image} className={`ministry-hero-slide ${index === current ? 'is-active' : ''}`} aria-hidden={index !== current} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${slides.length}`}><img src={slide.image} alt={slide.alt} width="933" height="1400" fetchpriority={index === 0 ? 'high' : 'low'} decoding="async" /></div>)}
        <figcaption>Apostle (Dr) Anchord Taiwo<span>Senior Pastor · Christ’s Reformation House International</span></figcaption>
      </figure>
    </div>
  </section>
}
