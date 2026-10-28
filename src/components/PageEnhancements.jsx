import { useEffect, useState } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { ArrowUp } from 'lucide-react'

export default function PageEnhancements() {
  const { pathname } = useLocation()
  const navigation = useNavigationType()
  const [showTop, setShowTop] = useState(false)
  useEffect(() => {
    if (navigation !== 'POP') window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const update = () => setShowTop(window.scrollY > 600)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [pathname, navigation])

  useEffect(() => {
    const main = document.querySelector('#main-content')
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!main || !window.IntersectionObserver) return
    let observer
    let mutations
    let frame
    const seen = new WeakSet()
    const disconnect = () => { observer?.disconnect(); mutations?.disconnect(); cancelAnimationFrame(frame) }
    const setup = () => {
      disconnect()
      if (preference?.matches) return
      observer = new window.IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('motion-enter')
          observer.unobserve(entry.target)
        }
      }, { threshold: 0.08 })
      const scan = () => {
        main.querySelectorAll('section:not(.ministry-hero), .ministry-pathway, .ministry-feature, .card').forEach((element, index) => {
          if (seen.has(element)) return
          seen.add(element)
          element.style.setProperty('--motion-delay', `${Math.min(index % 4, 3) * 60}ms`)
          observer.observe(element)
        })
      }
      scan()
      if (window.MutationObserver) {
        mutations = new window.MutationObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(scan) })
        mutations.observe(main, { childList: true, subtree: true })
      }
    }
    setup()
    preference?.addEventListener('change', setup)
    return () => { disconnect(); preference?.removeEventListener('change', setup) }
  }, [pathname])

  return <>
    <a href="#main-content" className="site-skip-link">Skip to main content</a>
    {showTop && <button type="button" className="site-back-top" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })}><ArrowUp size={20} /><span>Top</span></button>}
  </>
}
