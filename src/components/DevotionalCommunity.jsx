import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, MessageCircle, Share2, Copy, Download, Gift, Instagram, Facebook } from 'lucide-react'
import { devotionalVisitor,readCommunity,likeDevotional,commentOnDevotional,devotionalError } from '../services/devotionals'
import { devotionalShare,downloadVerseCard } from '../utils/devotional-share.mjs'
export function DevotionalGiving() {
  return <section className="dev-giving dev-no-print" aria-label="Support the ministry"><Gift size={30}/><div><h2>Help the Word reach more people</h2><p>Your voluntary gift supports the ministry’s work. Give securely through our giving page.</p></div><Link to="/donate" className="dev-give-link">Give to the ministry →</Link></section>
}
export default function DevotionalCommunity({entry,preview=false}) {
  const share=devotionalShare(entry)
  const [visitor,setVisitor]=useState('')
  const [state,setState]=useState(null)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [busy,setBusy]=useState(false)
  const [loading,setLoading]=useState(!preview)
  const [retry,setRetry]=useState(0)
  const [instagram,setInstagram]=useState(false)
  const [name,setName]=useState('')
  const [body,setBody]=useState('')
  const [consent,setConsent]=useState(false)
  const submission=useRef(null)
  const currentDate=useRef(entry.publicationDate)
  currentDate.current=entry.publicationDate
  useEffect(()=>{
    let active=true
    if(preview)return
    let token='';try{token=devotionalVisitor();setVisitor(token)}catch{setNotice('Likes and comments need browser storage. Sharing and giving still work.')}
    setState(null);setLoading(true);setError('')
    readCommunity(entry.publicationDate,token).then(r=>{if(active)setState(r.data)}).catch(e=>{if(active)setError(devotionalError(e))}).finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[entry.publicationDate,preview,retry])
  async function copy() {
    try{await navigator.clipboard.writeText(share.caption);setNotice('Caption and reading link copied. Paste them into your post or message.')}catch{setInstagram(true);setNotice('Copy the caption below to share this reading.')}
  }
  async function nativeShare() {
    if(!navigator.share){await copy();return}
    try{await navigator.share({title:entry.title,text:entry.socialSummary,url:share.url})}catch(e){if(e.name!=='AbortError'){setInstagram(true);setNotice('Use the caption below or choose WhatsApp or Facebook.')}}
  }
  async function like() {
    const date=entry.publicationDate;setBusy(true);setError('')
    try{const r=await likeDevotional(date,visitor,!state.liked);if(currentDate.current===date)setState(s=>({...s,...r.data}))}catch(e){if(currentDate.current===date)setError(devotionalError(e))}finally{setBusy(false)}
  }
  async function submit(e) {
    e.preventDefault();const date=entry.publicationDate;setBusy(true);setError('');setNotice('')
    try{
      const fingerprint=JSON.stringify([name,body]);if(submission.current?.fingerprint!==fingerprint)submission.current={fingerprint,id:crypto.randomUUID()}
      const r=await commentOnDevotional(date,visitor,{displayName:name,body,consent,submissionId:submission.current.id})
      if(currentDate.current===date){setNotice(r.data.message);setBody('');setConsent(false);submission.current=null}
    }catch(e){if(currentDate.current===date)setError(devotionalError(e))}finally{setBusy(false)}
  }
  async function more() {
    const date=entry.publicationDate;setBusy(true);setError('')
    try{const r=await readCommunity(date,visitor,state.nextOffset);if(currentDate.current===date)setState(s=>({...r.data,comments:[...s.comments,...r.data.comments]}))}catch(e){if(currentDate.current===date)setError(devotionalError(e))}finally{setBusy(false)}
  }
  return <section className="dev-community dev-no-print" aria-label="Share and discuss this devotional">
    <p className="dev-eyebrow">ENCOURAGE SOMEONE TODAY</p><h2>Share the Word. Grow together.</h2>
    {preview?<><p>This is an editorial preview. Reader sharing, likes and comments become available when the reading is released.</p><div className="dev-social" aria-label="Reader actions preview"><button disabled>WhatsApp</button><button disabled>Facebook</button><button disabled>Instagram</button><button disabled>Like</button><button disabled>Add a comment</button></div></>:<>
      <div className="dev-social"><a href={share.whatsapp} target="_blank" rel="noopener noreferrer" className="dev-whatsapp">WhatsApp</a><a href={share.facebook} target="_blank" rel="noopener noreferrer"><Facebook size={18}/> Facebook</a><button onClick={()=>setInstagram(!instagram)} aria-expanded={instagram}><Instagram size={18}/> Instagram</button><button onClick={nativeShare}><Share2 size={18}/> More apps</button><button onClick={copy}><Copy size={18}/> Copy</button></div>
      {instagram&&<div className="dev-instagram"><h3>Share on Instagram</h3><p>Download the verse card and copy the caption, then add them to your Instagram post or story. You choose when to publish.</p><label>Caption and reading link<textarea readOnly rows={5} value={share.caption} onFocus={e=>e.target.select()}/></label><div className="dev-toolbar"><button onClick={copy}><Copy size={16}/> Copy caption</button><button onClick={async()=>{try{await downloadVerseCard(entry);setNotice('Verse card downloaded. Add it to your Instagram post or story.')}catch{setError('The verse card could not be created in this browser. You can still copy the caption.')}}}><Download size={16}/> Download verse card</button><a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">Open Instagram</a></div></div>}
      <p role="status">{notice}</p>{error&&<div role="alert" className="dev-error">{error} <button onClick={()=>setRetry(x=>x+1)}>Reload community</button></div>}
      {loading?<p role="status">Loading reader responses…</p>:<>
        <div className="dev-response-bar"><button onClick={like} disabled={busy||!state||!visitor} aria-pressed={Boolean(state?.liked)}><Heart size={18} fill={state?.liked?'currentColor':'none'}/>{state?.liked?'Liked':'Like'}{state?` · ${state.likes}`:''}</button><p>One like per browser for each reading.</p></div>
        <h3><MessageCircle size={20}/> Reader reflections</h3><p>Share how today’s reading encouraged you. Comments are reviewed before publication. Display names are supplied by guests.</p>
        {state?.comments?.map(c=><article className="dev-comment" key={c.id}><div><strong>{c.display_name}</strong><small>Guest · {String(c.created_at).slice(0,10)}</small></div><p>{c.body}</p></article>)}
        {state&&!state.comments.length&&<p>No comments have been approved yet. You can be the first to share a reflection.</p>}
        {state?.nextOffset!=null&&<button disabled={busy} onClick={more}>Load more comments</button>}
        <form onSubmit={submit} className="dev-comment-form"><h3>Add a comment</h3><label htmlFor="dev-comment-name">Display name (public)<input id="dev-comment-name" required minLength={2} maxLength={60} value={name} onChange={e=>setName(e.target.value)} autoComplete="nickname"/></label><label htmlFor="dev-comment-body">Your reflection<textarea id="dev-comment-body" required minLength={3} maxLength={2000} rows={4} value={body} onChange={e=>setBody(e.target.value)} placeholder="Share a thoughtful response to today’s reading"/></label><p>Keep private contact details, payment information and sensitive prayer requests out of public comments.</p><label className="dev-check"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/> I agree to publish my display name and comment after review.</label><button disabled={busy||!visitor||!state||!consent}>Submit for review</button></form>
      </>}
    </>}
  </section>
}
