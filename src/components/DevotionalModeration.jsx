import { useEffect,useState } from 'react'
import { moderateComments,reviewComment,devotionalError } from '../services/devotionals'
export default function DevotionalModeration() {
  const [status,setStatus]=useState('pending')
  const [data,setData]=useState({comments:[],nextOffset:null})
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [busy,setBusy]=useState(false)
  const [retry,setRetry]=useState(0)
  useEffect(()=>{let active=true;setBusy(true);setError('');moderateComments(status).then(r=>{if(active)setData(r.data)}).catch(e=>{if(active)setError(devotionalError(e))}).finally(()=>{if(active)setBusy(false)});return()=>{active=false}},[status,retry])
  async function review(comment,next) {setBusy(true);setError('');try{const r=await reviewComment(comment.id,next,comment.status);setNotice(r.data.message);setRetry(x=>x+1)}catch(e){setError(devotionalError(e));setBusy(false)}}
  return <section className="dev-card dev-moderation"><h2>Reader comment moderation</h2><p>Approve thoughtful reflections or hide comments. Pending and rejected comments are private.</p><label>Show comments<select value={status} disabled={busy} onChange={e=>setStatus(e.target.value)}><option value="pending">Awaiting review</option><option value="approved">Approved</option><option value="rejected">Hidden</option></select></label><button disabled={busy} onClick={()=>setRetry(x=>x+1)}>Refresh comments</button><p role="status">{busy?'Loading…':notice}</p>{error&&<p role="alert" className="dev-error">{error}</p>}{!busy&&!data.comments.length&&<p>No comments in this queue.</p>}{data.comments.map(c=><article key={c.id} className="dev-comment"><p><strong>{c.display_name}</strong> · {c.publication_date} · {c.status}</p><p>{c.body}</p><div className="dev-toolbar">{c.status!=='approved'&&<button disabled={busy} onClick={()=>review(c,'approved')}>Approve comment</button>}{c.status!=='rejected'&&<button disabled={busy} onClick={()=>review(c,'rejected')}>Hide comment</button>}</div></article>)}{data.nextOffset!=null&&<button disabled={busy} onClick={async()=>{setBusy(true);try{const r=await moderateComments(status,data.nextOffset);setData(s=>({...r.data,comments:[...s.comments,...r.data.comments]}))}catch(e){setError(devotionalError(e))}finally{setBusy(false)}}}>Load more for review</button>}</section>
}
