import MeetingRegistration from './MeetingRegistration'
import ContentShare from '../ContentShare'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Video } from 'lucide-react'

export default function InvitationPanel({ invitation, showOpen = true }) {
  const [notice, setNotice] = useState('')
  const input = useRef(null)
  async function copy() {
    try { if (!navigator.clipboard?.writeText) throw new Error(); await navigator.clipboard.writeText(invitation.url); setNotice('Invitation link copied.') }
    catch { input.current?.focus(); input.current?.select(); setNotice('Select the invitation link and copy it using your device’s copy command.') }
  }
  return <div className="invitation-panel"><p className="ministry-eyebrow">Your invitation is ready</p><h3>{invitation.title || 'CRH Online Fellowship'}</h3><p>Open the room and sign in as host first. Enable the lobby or a password before sharing with guests.</p><label htmlFor="meeting-invitation-link">Invitation link<input ref={input} id="meeting-invitation-link" readOnly value={invitation.url} onFocus={event => event.target.select()} /></label><div className="platform-actions">{showOpen && <Link className="ministry-button dark" to={new URL(invitation.url).pathname + new URL(invitation.url).search}><Video size={18} />Open meeting room</Link>}<button type="button" className="secondary-button" onClick={copy}><Copy size={17} />Copy invitation</button></div><ContentShare title={invitation.title || 'CRH Online Fellowship'} text="Please wait for the host to start the meeting." url={invitation.url} showCopy={false} />{notice && <p role="status">{notice}</p>}<MeetingRegistration key={invitation.url} invitation={invitation}/><p className="text-xs text-slate-500">Creating a link does not start or publicly announce a meeting. Treat private invitations like passwords.</p></div>
}
