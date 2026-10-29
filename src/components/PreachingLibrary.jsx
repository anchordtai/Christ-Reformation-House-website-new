import { Link } from 'react-router-dom'
import { ArrowUpRight, PlayCircle } from 'lucide-react'
import { preachingTopics, ministryFacebook } from '../content/ministry'

export default function PreachingLibrary() {
  return <div className="preaching-grid">{preachingTopics.map(topic => <article className="preaching-card" key={topic.id}>
    <a className="preaching-visual" href={ministryFacebook} target="_blank" rel="noopener noreferrer" aria-label={`Browse ministry preaching on Facebook: ${topic.eyebrow}`}><img src={topic.image} alt="Apostle (Dr) Anchord Taiwo" loading="lazy" decoding="async" /><span className="preaching-play"><PlayCircle size={32} />Watch on Facebook</span><span className="preaching-tag">{topic.eyebrow}</span></a>
    <div className="preaching-copy"><span className="scripture-ref">{topic.scripture}</span><h3>{topic.title}</h3><p>{topic.text}</p>{topic.href ? <Link to={topic.href}>{topic.action}<ArrowUpRight size={17} /></Link> : <a href={ministryFacebook} target="_blank" rel="noopener noreferrer">Browse preaching<ArrowUpRight size={17} /></a>}</div>
  </article>)}</div>
}
