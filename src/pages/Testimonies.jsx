import { useState } from 'react'
import { ArrowUpRight, Quote, ShieldCheck } from 'lucide-react'
import MetaTags from '../components/MetaTags'
import { approvedTestimonies, whatsappDraft } from '../content/ministry'
import { APP_CONFIG } from '../utils/constants'

export default function Testimonies() {
  const [form, setForm] = useState({ name: '', story: '', contact: false, publish: false })
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  function prepare(event) {
    event.preventDefault(); setError('')
    if (!form.name.trim() || !form.story.trim() || !form.contact) { setError('Please add your name and story, and confirm that the ministry may contact you about your testimony.'); return }
    setDraft(`Hello Christ’s Reformation House. I would like to share a testimony for ministry review.\n\nName: ${form.name.trim()}\n\nMy story: ${form.story.trim()}\n\nThe ministry may contact me about this story.\nPermission to publish after review: ${form.publish ? 'Yes — please confirm the final wording and public identity with me first.' : 'No — this story is private unless I give separate permission.'}`)
  }
  return <div className="platform-page"><MetaTags title="Testimonies" description="Share your story of faith, restoration or answered prayer with the ministry for review." />
    <section className="platform-page-hero"><div className="container-custom"><p className="ministry-eyebrow">Stories that encourage faith</p><h1>Your story.<br /><span>Someone else’s encouragement.</span></h1><p>Have a testimony of faith, restoration or answered prayer? We would love to hear it and celebrate God’s goodness with you.</p><a className="ministry-button" href="#share-testimony">Share your testimony<ArrowUpRight size={18} /></a></div></section>
    {approvedTestimonies.length > 0 && <section className="ministry-section testimony-grid">{approvedTestimonies.map(item => <blockquote key={item.id}><Quote size={26} /><p>{item.story}</p><cite>{item.publicName}</cite></blockquote>)}</section>}
    <section id="share-testimony" className="ministry-section testimony-layout"><div><p className="ministry-eyebrow">We will listen with care</p><h2>Tell us what you<br />would like to share.</h2><p className="platform-lead">Stories are reviewed by the ministry. Nothing submitted here is published automatically.</p><div className="testimony-note"><ShieldCheck size={23} /><p>You choose whether to give permission for publication. Avoid including medical documents, financial information or anyone else’s private details.</p></div><p className="text-sm text-slate-500">This form prepares a message. You will review and send it yourself through WhatsApp or your email app.</p></div>
      <div className="testimony-form">{draft ? <div role="status"><h3>Your testimony draft is ready.</h3><p>Choose a channel, review your message and send it to the ministry. The website has not sent or published your story.</p><div className="platform-actions"><a className="ministry-button dark" href={whatsappDraft(draft)} target="_blank" rel="noopener noreferrer">Review in WhatsApp<ArrowUpRight size={17} /></a><a className="ministry-text-link" href={`mailto:${APP_CONFIG.CHURCH_EMAIL}?subject=${encodeURIComponent('Testimony for ministry review')}&body=${encodeURIComponent(draft)}`}>Open email draft</a></div><button type="button" className="text-link mt-5" onClick={() => setDraft('')}>Edit my story</button></div> : <form onSubmit={prepare}>
        <label htmlFor="testimony-name">Your name<input id="testimony-name" required maxLength={100} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} autoComplete="name" /></label>
        <label htmlFor="testimony-story">Your testimony<textarea id="testimony-story" required rows={6} maxLength={1600} value={form.story} onChange={event => setForm({ ...form, story: event.target.value })} placeholder="Tell us what you would like the ministry to know…" /></label>
        <label className="check-label"><input type="checkbox" required checked={form.contact} onChange={event => setForm({ ...form, contact: event.target.checked })} />I agree that the ministry may contact me about this story.</label>
        <label className="check-label"><input type="checkbox" checked={form.publish} onChange={event => setForm({ ...form, publish: event.target.checked })} />The ministry may consider publishing my testimony, after confirming its wording and my public identity with me.</label>
        {error && <p role="alert" className="text-red-700">{error}</p>}<button className="ministry-button dark" type="submit">Prepare my testimony<ArrowUpRight size={17} /></button><p className="text-xs text-slate-500 mt-3">Your story stays in this page until you open a message draft. It is not saved by this website.</p>
      </form>}</div>
    </section>
  </div>
}
