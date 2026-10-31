import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DevotionalReading from '../components/DevotionalReading'
import DevotionalCommunity from '../components/DevotionalCommunity'
import DevotionalModeration from '../components/DevotionalModeration'
import { editorToken, editorLogin, signOutEditor, listDrafts, saveEntry, devotionalError, requestEditorPassword, setEditorPassword } from '../services/devotionals'
import './Devotional.css'
const textFields = ['title','monthlyTheme','dailyTheme','messageTitle','mainReference','mainPassage','translation','centralTruth','message','declaration','dailyAction','closingPrayer','memoryReference','memoryVerse','reflectionQuestion','socialSummary','author']
const listFields = ['supportingReferences','keyLessons','individualPrayers','familyPrayers','churchPrayers','nationsPrayers','ministryPrayers']
const applicationFields = ['personal','family','work','relationships','service','spiritualGrowth']
const label = s => s.replace(/([A-Z])/g,' $1').replace(/^./,x=>x.toUpperCase())
const fresh = () => ({...Object.fromEntries(textFields.map(k=>[k,k==='translation'?'KJV':''])), ...Object.fromEntries(listFields.map(k=>[k,[]])), applications:Object.fromEntries(applicationFields.map(k=>[k,'']))})
export default function DevotionalEditor() {
  const [recoveryToken,setRecoveryToken] = useState(() => {
    const params = new URLSearchParams(window.location.hash.slice(1))
    const token = params.get('access_token')
    return params.get('type') === 'recovery' && token && token.length <= 8192 ? token : ''
  })
  const [resetMode,setResetMode] = useState(false)
  const [confirmPassword,setConfirmPassword] = useState('')
  const [signed,setSigned] = useState(() => !window.location.hash.includes('type=recovery') && !!editorToken())
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1))
    if (params.has('access_token') || params.has('refresh_token') || params.has('error')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      if (params.has('error')) setError('This email link has expired or is invalid. Request a new password email.')
    }
  },[])
  const [rows,setRows] = useState([])
  const [row,setRow] = useState(null)
  const [content,setContent] = useState(null)
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [error,setError] = useState('')
  const [notice,setNotice] = useState('')
  const [busy,setBusy] = useState(false)
  const [dirty,setDirty] = useState(false)
  const [review,setReview] = useState(false)
  const [release,setRelease] = useState('')
  const [status,setStatus] = useState('draft')
  const [preview,setPreview] = useState(false)
  function handleError(e) { setError(devotionalError(e)); if(e.response?.status===401) { signOutEditor(); setSigned(false) } }
  async function load() { const r = await listDrafts(); setRows(r.data.entries); return r.data.entries }
  useEffect(()=>{ if(signed) load().catch(handleError) },[signed])
  useEffect(()=>{ const f=e=>{if(dirty){e.preventDefault();e.returnValue=''}}; window.addEventListener('beforeunload',f); return()=>window.removeEventListener('beforeunload',f) },[dirty])
  async function login(e) { e.preventDefault();setBusy(true);setError('');try{await editorLogin(email,password);setPassword('');setSigned(true)}catch(e){handleError(e)}finally{setBusy(false)} }
  async function requestPassword(e) {
    e.preventDefault();setBusy(true);setError('');setNotice('')
    try { setNotice(await requestEditorPassword(email)) } catch(e) { setError(devotionalError(e)) } finally { setBusy(false) }
  }
  async function choosePassword(e) {
    e.preventDefault();setError('');setNotice('')
    if(password !== confirmPassword) { setError('The passwords do not match.'); return }
    if(password.length < 12 || password.length > 128) { setError('Choose a password between 12 and 128 characters.'); return }
    setBusy(true)
    try { const message = await setEditorPassword(recoveryToken,password);signOutEditor();setRecoveryToken('');setPassword('');setConfirmPassword('');setResetMode(false);setSigned(false);setNotice(message) }
    catch(e) { setError(devotionalError(e)); if(e.response?.status===401) {setRecoveryToken('');setResetMode(true);setPassword('');setConfirmPassword('')} }
    finally { setBusy(false) }
  }
  function open(r) { if(dirty && !window.confirm('Discard unsaved edits?')) return; setRow(r);setContent(structuredClone(r.content));setDirty(false);setReview(false);setStatus('draft');setRelease('');setPreview(false);setError('');setNotice('') }
  function edit(next) { setContent(next);setDirty(true);setReview(false) }
  async function save(e) {
    e.preventDefault();setBusy(true);setError('');setNotice('')
    try {
      const result = await saveEntry(row.publication_date,{content,status,expectedRevision:row.revision,reviewAcknowledged:review,releaseAt:release?new Date(release).toISOString():null})
      setRow(result.data.entry);setDirty(false);setReview(false);setNotice(`Saved as ${result.data.entry.status}.`)
      await load()
    }catch(e){handleError(e)}finally{setBusy(false)}
  }
  async function importDrafts(e) {
    const file=e.target.files?.[0];e.target.value=''; if(!file)return
    setError('');setNotice('');setBusy(true);let count=0
    try {
      if(file.size>2000000)throw new Error('Choose the November draft JSON file (under 2 MB).')
      const batch=JSON.parse(await file.text())
      if(!Array.isArray(batch)||batch.length>31||!batch.length)throw new Error('Choose a draft array with 1–31 entries.')
      // Each date is insert-only. Existing entries are never overwritten by import.
      const current=await load();const existing=new Set(current.map(r=>r.publication_date))
      for(const c of batch){
        if(existing.has(c.publicationDate))continue
        await saveEntry(c.publicationDate,{content:c,status:'draft',expectedRevision:0})
        existing.add(c.publicationDate);count++;setNotice(`Imported ${count} drafts…`)
      }
      await load();setNotice(`Imported ${count} drafts. Existing dates were skipped. Nothing was published.`)
    }catch(e){setError(`${count} drafts imported before stopping. ${e.response?devotionalError(e):e.message}`);if(e.response?.status===401){signOutEditor();setSigned(false)}}finally{setBusy(false)}
  }
  return <div className="dev-page"><div className="dev-wrap dev-editor"><Link to="/devotional">← Devotional reader</Link><h1>Devotional editorial desk</h1><div className="platform-actions"><Link to="/admin/store">Store desk</Link><Link to="/admin/contact">Contact inbox</Link></div><p>Programme: 1 November 2026 – 31 October 2027. Manuscripts remain private until reviewed and released.</p>
    {error&&<p role="alert" className="dev-error">{error}</p>}<p role="status">{notice}</p>
    {recoveryToken?<form className="dev-card" onSubmit={choosePassword}><h2>Choose your editorial password</h2><p>Use a unique password with at least 12 characters. Your password is sent securely to the ministry’s authentication service.</p><label>New password<input type="password" required minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password"/></label><label>Confirm new password<input type="password" required minLength={12} maxLength={128} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} autoComplete="new-password"/></label><button disabled={busy}>Save password</button></form>:!signed?<form className="dev-card" onSubmit={resetMode?requestPassword:login}><h2>{resetMode?'Set or reset your password':'Editor sign in'}</h2>{resetMode&&<p>Enter the email address of your editor account. Open the link in your email to choose a password.</p>}<label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username"/></label>{!resetMode&&<label>Password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/></label>}<div className="dev-toolbar"><button disabled={busy}>{resetMode?'Email password setup link':'Sign in'}</button><button type="button" disabled={busy} onClick={()=>{setResetMode(!resetMode);setPassword('');setError('');setNotice('')}}>{resetMode?'Back to sign in':'Set or reset password'}</button></div></form>:<>
      <details className="dev-moderation-toggle"><summary>Reader comments · review and moderate</summary><DevotionalModeration/></details>
      <div className="dev-toolbar"><label className="dev-import">Import private draft JSON<input type="file" accept=".json,application/json" disabled={busy} onChange={importDrafts}/></label><button disabled={busy} onClick={()=>{if(dirty&&!window.confirm('Discard unsaved edits and sign out?'))return;signOutEditor();setSigned(false);setContent(null);setRow(null);setRows([]);setDirty(false)}}>Sign out</button><button disabled={busy} onClick={()=>load().catch(handleError)}>Reload list</button></div>
      <div className="dev-layout"><aside className="dev-card"><h2>Readings</h2><label>New reading date<input type="date" min="2026-11-01" max="2027-10-31" disabled={busy} onChange={e=>{if(e.target.value)open(rows.find(r=>r.publication_date===e.target.value)||{publication_date:e.target.value,revision:0,content:fresh()})}}/></label><nav>{rows.map(r=><button className="dev-entry-button" disabled={busy} key={r.publication_date} onClick={()=>open(r)}>{r.publication_date} · {r.status}<strong>{r.content.title}</strong></button>)}</nav></aside>
      {content&&<form className="dev-card" onSubmit={save}><h2>{row.publication_date} · Revision {row.revision}{dirty?' · Unsaved':''}</h2><p>Stored status: {row.status||'new draft'}. Saving as draft withdraws any previously released reading.</p><button type="button" onClick={()=>setPreview(!preview)}>{preview?'Continue editing':'Preview devotional'}</button>
        {preview?<><DevotionalReading entry={{...content,publicationDate:row.publication_date,dayNumber:Math.round((Date.parse(row.publication_date)-Date.parse('2026-11-01'))/86400000)+1}}/><DevotionalCommunity entry={{...content,publicationDate:row.publication_date}} preview/></>:<fieldset disabled={busy}>{textFields.map(k=><label key={k}>{label(k)}<textarea rows={['message','mainPassage','declaration'].includes(k)?7:2} value={content[k]||''} onChange={e=>edit({...content,[k]:e.target.value})}/></label>)}{listFields.map(k=><label key={k}>{label(k)} · one point per line<textarea rows={6} value={(content[k]||[]).join('\n')} onChange={e=>edit({...content,[k]:e.target.value.split('\n')})}/></label>)}<h3>Life applications</h3>{applicationFields.map(k=><label key={k}>{label(k)}<textarea rows={2} value={content.applications?.[k]||''} onChange={e=>edit({...content,applications:{...content.applications,[k]:e.target.value}})}/></label>)}</fieldset>}
        <label>Save status<select disabled={busy} value={status} onChange={e=>{setStatus(e.target.value);setReview(false)}}><option value="draft">Draft (private)</option><option value="scheduled">Scheduled</option><option value="published">Publish now</option></select></label>
        {status!=='draft'&&<><label>Release date and time · your device’s local time<input type="datetime-local" required value={release} onChange={e=>{setRelease(e.target.value);setReview(false)}}/></label><p>Readers use the Africa/Lagos calendar. Release cannot precede this reading’s date.</p><label className="dev-check"><input type="checkbox" checked={review} onChange={e=>setReview(e.target.checked)}/> I have completed pastoral review of the Scripture, interpretation and wording, and approve this version for release.</label></>}
        <button disabled={busy||(status!=='draft'&&!review)}>{busy?'Working…':status==='draft'?'Save private draft':status==='scheduled'?'Schedule reviewed reading':'Publish reviewed reading'}</button>
      </form>}</div></>}
  </div></div>
}

