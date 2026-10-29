import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Download, ArrowLeft } from 'lucide-react'
import MetaTags from '../components/MetaTags'
import InvitationPanel from '../components/meetings/InvitationPanel'
import { newMeetingRoom, meetingLink, meetingCalendar } from '../utils/meeting-links.mjs'

export default function PlanMeeting() {
  const [form, setForm] = useState({ title: '', start: '', duration: '60' })
  const [invitation, setInvitation] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  function prepare(event) {
    event.preventDefault(); setError(''); setNotice('')
    try {
      const start = new Date(form.start)
      if (!form.title.trim() || !Number.isFinite(start.getTime()) || start.getTime() < Date.now()) throw new Error('Add a title and a start time in the future.')
      const room = newMeetingRoom(); const url = meetingLink(room, window.location.origin, form.title)
      const ics = meetingCalendar({ room, url, title: form.title.trim(), start, duration: Number(form.duration) })
      setInvitation({ room, url, title: form.title.trim(), ics })
    } catch (cause) { setError(cause.message) }
  }
  function download() {
    try {
      const url = URL.createObjectURL(new Blob([invitation.ics], { type: 'text/calendar;charset=utf-8' }))
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'crh-meeting-invitation.ics'; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000)
      setNotice('Calendar download requested. Open the file in your calendar and send the invitation to your guests.')
    } catch { setError('The calendar could not download. You can still copy and share the meeting link.') }
  }
  return <div className="platform-page"><MetaTags title="Plan a meeting" description="Prepare a meeting invitation and calendar file to share with your guests." /><section className="platform-page-hero"><div className="container-custom"><Link to="/meetings" className="meeting-back"><ArrowLeft size={17} />Meeting center</Link><p className="ministry-eyebrow">Gather with intention</p><h1>Choose a time.<br /><span>Bring people together.</span></h1><p>Create a meeting link and calendar invitation. This does not publish an event on the church website or automatically email guests.</p></div></section><section className="ministry-section meeting-form-grid"><div className="meeting-action-card"><Calendar size={28} /><h2>Plan your gathering</h2><form onSubmit={prepare}><label htmlFor="plan-title">Meeting title<input id="plan-title" required maxLength={100} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></label><label htmlFor="plan-start">Start time (your local time)<input id="plan-start" type="datetime-local" required value={form.start} onChange={event => setForm({ ...form, start: event.target.value })} /></label><label htmlFor="plan-duration">Duration<select id="plan-duration" value={form.duration} onChange={event => setForm({ ...form, duration: event.target.value })}>{[15,30,45,60,90,95].map(value => <option key={value} value={value}>{value} minutes</option>)}</select></label>{error && <p role="alert" className="platform-error">{error}</p>}<button type="submit" className="ministry-button dark">Prepare invitation</button></form></div><div>{invitation ? <><InvitationPanel invitation={invitation} /><button type="button" className="secondary-button mt-4" onClick={download}><Download size={18} />Download calendar invitation</button>{notice && <p role="status" className="mt-3 text-sm">{notice}</p>}</> : <div className="meeting-action-card light"><h2>Ready for Sunday?</h2><p>Start with a short rehearsal. Ask one guest to join, check two-way audio and video, then try presenting a window.</p><p>The public meeting service requires host sign-in and has a 95-minute session limit. Plan breaks and a new room for longer gatherings.</p></div>}</div></section></div>
}
