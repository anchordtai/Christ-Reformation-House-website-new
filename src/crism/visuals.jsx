import {useEffect} from 'react'
export const schoolImages={
  study:{src:'/assets/crism/bible-library.webp',alt:'Illustrative sunlit library with an open Bible on a study table'},
  community:{src:'/assets/crism/learning-together.webp',alt:'Illustrative group of adults studying Scripture together'},
  service:{src:'/assets/crism/ministry-service.webp',alt:'Illustrative ministry volunteers walking together with books and supplies'},
}
export const schoolCardImages={
  "biblical-studies": {
    "src": "/assets/crism/school-biblical-studies.webp",
    "alt": "Illustrative learner comparing Scripture and writing study notes"
  },
  "theology": {
    "src": "/assets/crism/school-theology.webp",
    "alt": "Illustrative theology tutor discussing doctrine and church history with adult learners"
  },
  "ministry-pastoral-studies": {
    "src": "/assets/crism/school-ministry-pastoral-studies.webp",
    "alt": "Illustrative minister practicing preaching from an open Bible"
  },
  "christian-leadership": {
    "src": "/assets/crism/school-christian-leadership.webp",
    "alt": "Illustrative ministry leadership team planning together"
  },
  "missions-evangelism": {
    "src": "/assets/crism/school-missions-evangelism.webp",
    "alt": "Illustrative cross-cultural outreach group sharing Scripture in a community"
  },
  "counselling-family-ministry": {
    "src": "/assets/crism/school-counselling-family-ministry.webp",
    "alt": "Illustrative pastoral-care facilitator listening to an adult couple"
  }
}
export function imageForSchool(slug=""){return schoolCardImages[slug]||schoolImages.community}
export function SchoolScene({kind='community',caption,compact=false}){const image=schoolImages[kind];return <figure className={'crism-scene crism-reveal'+(compact?' compact':'')}><img src={image.src} alt={image.alt} width="1536" height="1024" loading="lazy" decoding="async"/><figcaption>{caption||'Scripture. Formation. Service.'}<small>Illustrative ministry imagery</small></figcaption></figure>}
export function useSchoolReveal(pathname){useEffect(()=>{if(typeof window.IntersectionObserver!=='function'||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;const nodes=document.querySelectorAll('.crism-reveal, .crism-school, .crism-pillars article');const observer=new window.IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-revealed');observer.unobserve(entry.target)}})},{threshold:.08});nodes.forEach(node=>{node.classList.add('reveal-ready');observer.observe(node)});return()=>{observer.disconnect();nodes.forEach(node=>node.classList.remove('reveal-ready'))}},[pathname])}
