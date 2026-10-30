import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Video, Mic, Monitor, MessageCircle, Calendar, ArrowRight, Users, ShieldCheck } from 'lucide-react'
import MetaTags from '../components/MetaTags'
import DeviceCheck from '../components/meetings/DeviceCheck'
import InvitationPanel from '../components/meetings/InvitationPanel'
import { newMeetingRoom, meetingLink, parseMeetingInput } from '../utils/meeting-links.mjs'
import { meetingConfig } from '../services/ministry'

export default function Meetings() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [join, setJoin] = useState('')
  const [error, setError] = useState('')
  const [invitation, setInvitation] = useState(null)
  const [embedded,setEmbedded] = useState(false)
  useEffect(()=>{let active=true;meetingConfig().then(config=>{if(active)setEmbedded(config.embedded)}).catch(()=>{});return()=>{active=false}},[])
  function create(event) {
    event.preventDefault(); setError('')
    try { const room = newMeetingRoom(); setInvitation({ room, title: title.trim().slice(0, 100) || 'CRH Online Fellowship', url: meetingLink(room, window.location.origin, title) }) }
    catch (cause) { setError(cause.message) }
  }
  function joinRoom(event) {
    event.preventDefault(); setError('')
    try { const parsed = parseMeetingInput(join, window.location.origin); const url = new URL(meetingLink(parsed.room, window.location.origin, parsed.title)); if(parsed.publicProvider)url.searchParams.set('provider','public'); navigate(url.pathname + url.search) }
    catch (cause) { setError(cause.message) }
  }
  return <div className="platform-page meeting-center"><MetaTags title="Online meeting center" description="Create or join an online ministry meeting with audio, video, screen sharing and chat." />
    <section className="platform-page-hero"><div className="container-custom"><p className="ministry-eyebrow">Fellowship beyond distance</p><h1>One invitation.<br /><span>Room for connection.</span></h1><p>Gather for prayer, teaching and conversation. Prepare your invitation, check your devices and join your gathering with audio, video, screen sharing and chat.</p><div className="meeting-features"><span><Mic size={17} />Audio</span><span><Video size={17} />Video</span><span><Monitor size={17} />Screen sharing</span><span><MessageCircle size={17} />Chat</span></div><div className="platform-actions mt-6"><Link className="ministry-button" to="/events"><Calendar size={17}/>Explore church events</Link></div></div></section>
    <section className="ministry-section"><div className="meeting-notice"><ShieldCheck size={22} /><p><strong>Before you host:</strong> {embedded?'Your call stays inside this website. Authorized hosts sign in with their ministry account; guests enter their name. Start the room before inviting guests.':'The current public Jitsi connection opens in a separate window and requires the host to sign in. Public sessions have a 95-minute limit. In-website calling will become available when the ministry’s meeting connection is activated.'}</p></div>
      {error && <p role="alert" className="platform-error">{error}</p>}
      <div className="meeting-form-grid"><article className="meeting-action-card"><Video size={30} /><h2>Host a meeting</h2><p>Create a unique invitation for your gathering. No ministry-site account is required to prepare a link.</p><form onSubmit={create}><label htmlFor="meeting-title">Meeting title (optional)<input id="meeting-title" maxLength={100} value={title} onChange={event => setTitle(event.target.value)} placeholder="Prayer, Bible study, fellowship…" /></label><button className="ministry-button dark" type="submit">Create an invitation<ArrowRight size={18} /></button></form><Link className="text-link" to="/meetings/schedule"><Calendar size={16} />Plan a time and download a calendar invitation</Link></article>
        <article className="meeting-action-card light"><Users size={30} /><h2>Join your gathering</h2><p>Have an invitation from your host? Paste the full church or Jitsi meeting link, or enter the meeting code.</p><form onSubmit={joinRoom}><label htmlFor="meeting-join">Invitation link or meeting code<input id="meeting-join" value={join} onChange={event => setJoin(event.target.value)} maxLength={1000} required placeholder="Paste your host’s invitation" autoComplete="off" /></label><button className="ministry-button dark" type="submit">Continue to meeting<ArrowRight size={18} /></button></form><p className="text-xs text-slate-600">Guests may need to wait for the host or enter a room password.</p></article></div>
      {invitation && <InvitationPanel key={invitation.room} invitation={invitation} />}
      <DeviceCheck />
    </section>
    <section className="ministry-section meeting-help"><div className="ministry-section-heading"><div><p className="ministry-eyebrow">A smoother gathering</p><h2>A few steps.<br />A better conversation.</h2></div><p>Check your devices before Sunday, and rehearse with one guest before inviting the congregation.</p></div><div className="support-grid">{[{ title: 'Host first, then invite', text: 'Open the room, complete the provider’s host sign-in, and use its security controls to enable a lobby or password.' }, { title: 'Choose the right device', text: 'Use a current desktop browser for presenting your screen. Headphones help avoid echo. Camera and microphone permissions are controlled by your browser.' }, { title: 'Keep the invitation safe', text: 'Share private prayer-room links only with intended guests. Moderation and screen sharing use the provider’s controls. Recording availability depends on the provider.' }].map(item => <article className="support-card" key={item.title}><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></section>
  </div>
}
