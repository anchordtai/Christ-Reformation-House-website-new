import { ArrowUpRight } from 'lucide-react'
import PreachingLibrary from '../components/PreachingLibrary'
import MetaTags from '../components/MetaTags'
import { ministryFacebook } from '../content/ministry'

export default function Watch() {
  return <div className="platform-page"><MetaTags title="Watch & grow" description="Explore ministry preaching, faith, salvation and prayer with Christ’s Reformation House." />
    <section className="platform-page-hero"><div className="container-custom"><p className="ministry-eyebrow">The Word for your everyday life</p><h1>Hear the Word.<br /><span>Take it into your world.</span></h1><p>Explore preaching from Apostle (Dr) Anchord Taiwo through the ministry’s Facebook page. Start with a theme below, or browse the ministry’s posts and videos.</p><a className="ministry-button" href={ministryFacebook} target="_blank" rel="noopener noreferrer">Open ministry videos on Facebook<ArrowUpRight size={18} /></a></div></section>
    <section className="ministry-section"><div className="ministry-section-heading"><div><p className="ministry-eyebrow">Choose where to begin</p><h2>Faith. Salvation. Prayer.</h2></div><p>The video links open the ministry’s Facebook page. Our visitor guides offer a place to reflect and connect for prayer.</p></div><PreachingLibrary /></section>
  </div>
}
