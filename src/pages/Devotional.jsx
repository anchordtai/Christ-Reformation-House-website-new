import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { BookOpen, Share2, Printer, Bookmark, Check } from 'lucide-react'
import DevotionalReading from '../components/DevotionalReading'
import DevotionalArchive from '../components/DevotionalArchive'
import useDevotionalLibrary from '../hooks/useDevotionalLibrary'
import DevotionalBrand from '../components/DevotionalBrand'
import { DEVOTIONAL_BRAND as brand } from '../utils/devotional-brand.mjs'
import DevotionalCommunity, { DevotionalGiving } from '../components/DevotionalCommunity'
import { readDevotionals, devotionalError, nigeriaToday } from '../services/devotionals'
import './Devotional.css'
export default function Devotional() {
  const { date } = useParams()
  const navigate=useNavigate()
  const reader=useDevotionalLibrary()
  const selected = date || nigeriaToday()
  const [entry,setEntry] = useState(null)
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
  useEffect(()=>{if(entry?.publicationDate)reader.opened(entry.publicationDate)},[entry?.publicationDate,reader.library.rememberHistory])
  useEffect(() => {
    const old = document.title
    document.title = entry ? `${entry.title} | ${brand.title}` : `${brand.title} | CRH Daily Devotional`
    return () => { document.title=old }
  },[entry])
  async function share() {
    const url = `${window.location.origin}/devotional/${selected}`
    try {
      if (navigator.share) await navigator.share({ title:`${brand.title} | ${entry.title}`,text:entry.socialSummary,url })
      else { await navigator.clipboard.writeText(url); setNotice('Reading link copied.') }
    } catch(e) { if(e.name !== 'AbortError') setNotice('Copy the reading link from your address bar to share it.') }
  }
  return <div className="dev-page">
    <header className="dev-hero dev-no-print dev-series-hero"><div className="dev-wrap"><DevotionalBrand variant="page"/><small>365-day programme · 1 November 2026 – 31 October 2027</small></div></header>
    <div className="dev-wrap dev-layout">
      <div><div className="dev-toolbar dev-no-print"><label>Choose a date<input aria-label="Choose a devotional date" type="date" value={selected} min="2026-11-01" max="2027-10-31" onChange={e => { if(e.target.value) navigate(`/devotional/${e.target.value}`) }}/></label><Link to="/devotional">Today’s reading</Link>{entry && <><button aria-pressed={reader.library.bookmarks.includes(entry.publicationDate)} onClick={()=>reader.toggleBookmark(entry.publicationDate)}><Bookmark size={16}/>{reader.library.bookmarks.includes(entry.publicationDate)?'Saved reading':'Save reading'}</button><button onClick={share}><Share2 size={16}/> Share</button><button onClick={() => window.print()}><Printer size={16}/> Print</button></>}</div>
      <p role="status">{notice}</p>
      {(reader.storageNotice||!reader.persistent)&&<p role="status" className="dev-library-note">{reader.storageNotice||'Browser storage is unavailable. Your reading preferences may last only in this tab.'}</p>}
      {loading ? <div className="dev-card" role="status">Loading your reading…</div> : error ? <div className="dev-card" role="alert"><p>{error}</p><button onClick={() => setRetry(x=>x+1)}>Try again</button></div> : entry ? <DevotionalReading entry={entry}/> : <div className="dev-card"><BookOpen/><h2>No reading has been released for {selected}.</h2><p>Devotionals appear here after pastoral review and their scheduled release. You can choose an available reading from the archive.</p></div>}
      {entry&&<section className="dev-reading-progress dev-no-print"><div><h2>Make time for the Word.</h2><p>Finished reflecting on this reading? Mark it as read on this device.</p></div><button aria-pressed={reader.library.completed.includes(entry.publicationDate)} onClick={()=>reader.toggleRead(entry.publicationDate)}><Check size={17}/>{reader.library.completed.includes(entry.publicationDate)?'Marked as read · Undo':'Mark as read'}</button></section>}
      {entry && <DevotionalCommunity key={entry.publicationDate} entry={entry}/>}
      <DevotionalGiving/>
      </div>
      <DevotionalArchive selected={selected} reader={reader} retry={retry}/>
    </div>
  </div>
}

