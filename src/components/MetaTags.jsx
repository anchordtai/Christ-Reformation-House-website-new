import { useEffect } from 'react'

/**
 * SEO-friendly meta tags. Updates document title and meta description.
 * For full Open Graph / Twitter cards, add react-helmet-async: npm install react-helmet-async
 */
export default function MetaTags({ title, description, image, url }) {
  useEffect(() => {
    const prevTitle = document.title
    const prevDesc = document.querySelector('meta[name="description"]')?.getAttribute('content')

    if (title) document.title = `${title} | Christ's Reformation House`
    if (description) {
      let meta = document.querySelector('meta[name="description"]')
      if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute('name', 'description')
        document.head.appendChild(meta)
      }
      meta.setAttribute('content', description)
    }

    return () => {
      document.title = prevTitle
      if (prevDesc) {
        const m = document.querySelector('meta[name="description"]')
        if (m) m.setAttribute('content', prevDesc)
      }
    }
  }, [title, description])

  return null
}
