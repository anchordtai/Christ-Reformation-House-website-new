import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BookOpen, Share2, Printer } from 'lucide-react'
import DevotionalReading from '../components/DevotionalReading'
import DevotionalCommunity, { DevotionalGiving } from '../components/DevotionalCommunity'
import { readDevotionals, devotionalError, nigeriaToday } from '../services/devotionals'
import './Devotional.css'
export default function Devotional() {
  const { date } = useParams()
  const selected = date || nigeriaToday()
  const [entry,setEntry] = useState(null)
  const [entries,setEntries] = useState([])
  const [query,setQuery] = useState('')
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  const [notice,setNotice] = useState('')
  const [retry,setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setEntry(null); setNotice('')
    readDevotionals({date:selected}).then(r => { if(active) setEntry(r.data.entries[0] || null) }).catch(e => { if(active) setError(devotionalError(e)) }).finally(() => { if(active) setLoading(false) })
    return () => { active=false }
  },[selected,retry])
  useEffect(() => {
    let active=true
    readDevotionals({}).then(r => { if(active) setEntries(r.data.entries) }).catch(() => {})
    return () => { active=false }
  },[retry])
  useEffect(() => {
    const old = document.title
    document.title = entry ? `${entry.title} | CRH Daily Devotional` : 'Daily Devotional | Christ’s Reformation House'
    return () => { document.title=old }
  },[entry])
  async function share() {
    const url = `${window.location.origin}/devotional/${selected}`
    try {
      if (navigator.share) await navigator.share({ title:entry.title,text:entry.socialSummary,url })
      else { await navigator.clipboard.writeText(url); setNotice('Reading link copied.') }
    } catch(e) { if(e.name !== 'AbortError') setNotice('Copy the reading link from your address bar to share it.') }
  }
  return <div className="dev-page">
    <header className="dev-hero dev-no-print"><div className="dev-wrap"><BookOpen size={32}/><p className="dev-eyebrow">GROW IN THE WORD, EVERY DAY</p><h1>Daily bread for a life of faith</h1><p>Read, reflect and pray with Christ’s Reformation House Int’l Inc.</p><small>365-day programme · 1 November 2026 – 31 October 2027</small></div></header>
    <div className="dev-wrap dev-layout">
      <div><div className="dev-toolbar dev-no-print"><label>Choose a date<input aria-label="Choose a devotional date" type="date" value={selected} min="2026-11-01" max="2027-10-31" onChange={e => { if(e.target.value) window.location.assign(`/devotional/${e.target.value}`) }}/></label><Link to="/devotional">Today’s reading</Link>{entry && <><button onClick={share}><Share2 size={16}/> Share</button><button onClick={() => window.print()}><Printer size={16}/> Print</button></>}</div>
      <p role="status">{notice}</p>
      {loading ? <div className="dev-card" role="status">Loading your reading…</div> : error ? <div className="dev-card" role="alert"><p>{error}</p><button onClick={() => setRetry(x=>x+1)}>Try again</button></div> : entry ? <DevotionalReading entry={entry}/> : <div className="dev-card"><BookOpen/><h2>No reading has been released for {selected}.</h2><p>Devotionals appear here after pastoral review and their scheduled release. You can choose an available reading from the archive.</p></div>}
      {entry && <DevotionalCommunity key={entry.publicationDate} entry={entry}/>}
      <DevotionalGiving/>
      </div>
      <aside className="dev-card dev-archive dev-no-print"><p className="dev-eyebrow">READING ARCHIVE</p><h2>A moment with the Word</h2><label>Search released readings<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Title, theme or scripture"/></label><nav aria-label="Devotional archive">{entries.filter(c=>[c.title,c.monthlyTheme,c.mainReference].join(' ').toLowerCase().includes(query.toLowerCase())).map(c=><Link key={c.publicationDate} to={`/devotional/${c.publicationDate}`} aria-current={selected===c.publicationDate?'page':undefined}><small>{c.publicationDate} · Day {c.dayNumber}</small><strong>{c.title}</strong></Link>)}</nav>{!entries.length && <p>No released readings are available yet.</p>}<Link to="/admin/devotionals">Editorial desk</Link></aside>
    </div>
  </div>
}
