import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Calendar, Globe2, Heart, Users } from 'lucide-react'
import HeroCarousel from '../components/HeroCarousel'

const pathways = [
  { icon: BookOpen, title: 'Grow in the Word', description: 'Explore messages and teaching to strengthen your walk with Christ.', href: '/sermons', action: 'Explore messages' },
  { icon: Heart, title: 'Let us pray with you', description: 'Share what is on your heart and connect with our prayer ministry.', href: '/prayer-request', action: 'Request prayer' },
  { icon: Calendar, title: 'Gather and connect', description: 'Discover worship gatherings, ministry events, and opportunities for fellowship.', href: '/events', action: 'Explore events' },
  { icon: Users, title: 'Find your place', description: 'Discover ways to grow, serve, and participate in the life of the ministry.', href: '/ministries', action: 'Find a ministry' },
]
export default function Home() {
  return <div className="ministry-home">
    <HeroCarousel />
    <section className="ministry-welcome-strip"><div><Globe2 size={24} /><p><strong>From Abuja. With a heart for the nations.</strong><span>Faith, fellowship, and purpose—beyond the walls of a building.</span></p></div><Link to="/contact">Connect with us <ArrowRight size={17} /></Link></section>
    <section className="ministry-section">
      <div className="ministry-section-heading"><div><p className="ministry-eyebrow">Your next step</p><h2>There is a place for you here.</h2></div><p>Whether you are exploring faith or growing in your walk with Christ, begin with a step that meets you where you are.</p></div>
      <div className="ministry-pathways">{pathways.map(({ icon: Icon, title, description, href, action }, index) => <Link key={href} to={href} className="ministry-pathway"><div className="flex items-center justify-between"><Icon size={26} /><span className="text-xs text-slate-400">0{index + 1}</span></div><h3>{title}</h3><p>{description}</p><span className="ministry-card-action">{action}<ArrowRight size={17} /></span></Link>)}</div>
    </section>
    <section className="ministry-pastor-section"><div className="ministry-pastor-inner"><figure><img src="/assets/portraits/anchord-navy.webp" alt="Portrait of Apostle (Dr) Anchord Taiwo in a navy suit" width="1200" height="800" loading="lazy" decoding="async" /><figcaption>Leadership portrait · AI-created</figcaption></figure><div><p className="ministry-eyebrow">Meet our senior pastor</p><h2>A heart for people.<br />A life of ministry.</h2><p>Welcome to Christ’s Reformation House International. Our desire is to help people encounter the love of Christ, grow through His Word, and find a community where they can belong and serve.</p><h3>Apostle (Dr) Anchord Taiwo</h3><span className="text-sm text-slate-500">Senior Pastor</span><Link to="/about" className="ministry-text-link">Discover our mission <ArrowRight size={18} /></Link></div></div></section>
    <section className="ministry-section"><div className="ministry-section-heading"><div><p className="ministry-eyebrow">Faith in everyday life</p><h2>Keep growing. Keep connecting.</h2></div></div><div className="grid gap-6 md:grid-cols-2"><Link to="/devotional" className="ministry-feature"><BookOpen size={30} /><h3>Make room for the Word.</h3><p>Explore devotionals and make reflection part of your daily walk.</p><span>Read devotionals <ArrowRight size={18} /></span></Link><Link to="/meetings" className="ministry-feature ministry-feature-light"><Globe2 size={30} /><h3>Fellowship beyond distance.</h3><p>Explore available online meetings and opportunities to gather.</p><span>Explore meetings <ArrowRight size={18} /></span></Link></div></section>
    <section className="ministry-giving"><div><p className="ministry-eyebrow">Generosity with purpose</p><h2>Be part of the mission.</h2><p>Partner with us in sharing the Gospel, nurturing faith, and serving our community.</p></div><Link to="/donate" className="ministry-button">Give online <Heart size={18} /></Link></section>
  </div>
}
