import { useId, useState } from 'react'
import '../styles/scripture.css'

export default function ContentShare({ title, url, text = '', showCopy = true }) {
  const [notice, setNotice] = useState('')
  const [manualCopy, setManualCopy] = useState(false)
  const id = useId()
  let address
  try { address = new URL(url, window.location.origin) } catch { return null }
  if (!['http:', 'https:'].includes(address.protocol) || address.username || address.password) return null
  const invitation = [title, text, address.href].filter(Boolean).join('\n')
  async function copy() {
    try { await navigator.clipboard.writeText(address.href); setNotice('Link copied. You can paste it into a message or social post.'); setManualCopy(false) }
    catch { setManualCopy(true); setNotice('Copy the link below using your device’s copy command.') }
  }
  async function share() {
    try { await navigator.share({ title, text, url: address.href }); setNotice('Sharing options opened.') }
    catch (error) { if (error.name !== 'AbortError') await copy() }
  }
  return <div className="content-share" role="group" aria-label={`Share ${title}`}>
    <p className="content-share-title">Share this invitation</p>
    <div className="content-share-actions">
      <a href={`https://wa.me/?text=${encodeURIComponent(invitation)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(address.href)}`} target="_blank" rel="noopener noreferrer">Facebook</a>
      <a href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(invitation)}`}>Email</a>
      {showCopy && <button type="button" onClick={copy}>Copy link</button>}
      {typeof navigator.share === 'function' && <button type="button" onClick={share}>Share using your device</button>}
    </div>
    {manualCopy && <label htmlFor={id}>Invitation link<input id={id} value={address.href} readOnly onFocus={e => e.target.select()} /></label>}
    {notice && <p className="content-share-status" role="status">{notice}</p>}
  </div>
}
