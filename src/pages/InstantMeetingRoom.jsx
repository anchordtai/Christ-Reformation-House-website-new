import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Video, Monitor, ShieldCheck } from 'lucide-react'
import MetaTags from '../components/MetaTags'
import DeviceCheck from '../components/meetings/DeviceCheck'
import InvitationPanel from '../components/meetings/InvitationPanel'
import { validRoom, meetingLink, providerMeetingLink } from '../utils/meeting-links.mjs'

export default function InstantMeetingRoom() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const title = (params.get('title') || 'Online fellowship').slice(0, 100)
  const [opened, setOpened] = useState(0)
  useEffect(() => {
    let tag = document.querySelector('meta[name="robots"]')
    const previous = tag?.getAttribute('content')
    const created = !tag
    if (!tag) { tag = document.createElement('meta'); tag.name = 'robots'; document.head.append(tag) }
    tag.content = 'noindex, nofollow'
    return () => { if (created) tag.remove(); else tag.content = previous || '' }
  }, [])
  if (!validRoom(id)) return <div className="ministry-section"><h1 className="text-3xl font-bold">This meeting invitation is incomplete.</h1><p className="mt-4">Ask your host for the complete invitation link. We have not opened another room.</p><Link to="/meetings" className="ministry-text-link">Open meeting center<ArrowLeft size={17} /></Link></div>
  const invitation = { room: id, title, url: meetingLink(id, window.location.origin, title) }
  return <div className="platform-page"><MetaTags title="Meeting invitation" description="Open your meeting invitation and check your devices before joining." />
    <section className="platform-page-hero meeting-room-hero"><div className="container-custom"><Link to="/meetings" className="meeting-back"><ArrowLeft size={17} />Meeting center</Link><p className="ministry-eyebrow">You are invited</p><h1>{title}</h1><p>Check your devices, then open the call. Audio, video, screen sharing, participant chat and host controls are available in the meeting provider’s interface.</p><a className="ministry-button" href={providerMeetingLink(id)} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" onClick={() => setOpened(count => count + 1)}><Video size={20} />Open meeting in Jitsi<ArrowUpRight size={18} /></a><p className="meeting-open-note">Opens a separate window. The host must sign in to start; guests wait for the host. Public Jitsi sessions have a 95-minute limit.</p>{opened > 0 && <p role="status" className="meeting-open-note">The meeting link has been opened. If your browser blocked the new window, use the button again. This page cannot confirm whether you joined the call.</p>}</div></section>
    <section className="ministry-section meeting-room-layout"><div><DeviceCheck key={opened} /><div className="meeting-notice"><ShieldCheck size={22} /><p><strong>For hosts:</strong> sign in first, then enable the lobby or a room password. Share this invitation privately with intended guests.</p></div><div className="meeting-notice"><Monitor size={22} /><p><strong>For screen sharing:</strong> use the meeting’s screen-share control in a current desktop browser, choose the tab or window and confirm the browser prompt. Mobile browser support varies.</p></div></div><InvitationPanel invitation={invitation} showOpen={false} /></section>
  </div>
}
