import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Video, Calendar, Clock, Share2, Edit2, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { meetingCalendar } from '../utils/calendar.mjs'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import { meetingsService } from '../services/api'
import ShareMeeting from '../components/meetings/ShareMeeting'
import Loading from '../components/Loading'
import Error from '../components/Error'
import MetaTags from '../components/MetaTags'

export default function MeetingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { data: meeting, loading, error, refetch } = useApi(() => meetingsService.getById(id), [id])
  const [cancelling, setCancelling] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [inviteEmails, setInviteEmails] = useState('')
  const [sendingInvites, setSendingInvites] = useState(false)
  const [inviteMessage, setInviteMessage] = useState(null)

  const start = meeting?.startTime ? new Date(meeting.startTime) : null
  const end = meeting?.endTime ? new Date(meeting.endTime) : null
  const isCancelled = meeting?.status === 'cancelled'
  const isPast = end && end < new Date()
  const duration = start && end ? Math.round((end - start) / 60000) : null

  const downloadCalendar = () => {
    const content = meetingCalendar(meeting, `${window.location.origin}/meetings/room/${meeting.id}`)
    const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'ministry-meeting.ics'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const handleSendInvites = async (e) => {
    e.preventDefault()
    const emails = inviteEmails.split(/[\s,]+/).filter(Boolean)
    if (!emails.length) return
    setSendingInvites(true)
    setInviteMessage(null)
    try {
      const link = `${window.location.origin}/meetings/room/${meeting.id}`
      window.location.assign(`mailto:?bcc=${encodeURIComponent(emails.join(','))}&subject=${encodeURIComponent(meeting.title)}&body=${encodeURIComponent(`You are invited to ${meeting.title}.\n\nJoin: ${link}\nStarts: ${new Date(meeting.startTime).toLocaleString()}`)}`)
      setInviteMessage('Your email app was opened with an invitation draft. Review and send it there.')
      setInviteEmails('')
    } catch (err) {
      setInviteMessage(err.response?.data?.message || 'Failed to send invites.')
    } finally {
      setSendingInvites(false)
    }
  }

  const handleCancel = async () => {
    if (!meeting?.id || !window.confirm('Cancel this meeting? This prevents new joins through the website; it does not disconnect an ongoing call.')) return
    setCancelling(true)
    try {
      await meetingsService.cancel(meeting.id, cancelReason)
      refetch?.()
      setCancelReason('')
    } catch (err) {
      setInviteMessage(err.response?.data?.error || 'The meeting could not be cancelled. Please retry.')
    } finally {
      setCancelling(false)
    }
  }

  if (loading && !meeting) return <Loading message="Loading meeting..." />
  if (error && !meeting) return <Error message={error} />
  if (!meeting) return null

  return (
    <div className="min-h-screen bg-slate-50">
      <MetaTags title={meeting.title} description={meeting.description || 'Meeting details'} />

      <section className="bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white py-10">
        <div className="container-custom">
          <Link
            to="/meetings"
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white text-sm font-medium mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to meetings
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              {isCancelled && (
                <span className="inline-block px-3 py-1 rounded-full bg-slate-600 text-sm font-medium mb-3">
                  Cancelled
                </span>
              )}
              <h1 className="text-3xl sm:text-4xl font-bold">{meeting.title}</h1>
              {meeting.description && (
                <p className="text-slate-300 mt-2 max-w-2xl">{meeting.description}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-6 text-slate-300">
                {start && (
                  <span className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    {format(start, 'EEEE, MMMM d, yyyy')}
                  </span>
                )}
                {start && (
                  <span className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    {format(start, 'h:mm a')}
                    {duration && ` · ${duration} min`}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <ShareMeeting meeting={meeting} className="inline-block" />
              {!isCancelled && !isPast && (
                <Link
                  to={`/meetings/room/${meeting.id}${meeting.joinToken ? `?token=${meeting.joinToken}` : ''}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-slate-100"
                >
                  <Video className="w-5 h-5" />
                  Join meeting
                </Link>
              )}
              {isAdmin && (
                <Link
                  to={`/meetings/${meeting.id}/edit`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl"
                >
                  <Edit2 className="w-5 h-5" />
                  Edit
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom max-w-3xl">
          {isAdmin && !isCancelled && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
              <h2 className="font-semibold text-slate-900 mb-2">Invite by email</h2>
              <p className="text-sm text-slate-600 mb-3">Prepare an invitation in your email app, then review and send it there.</p>
              <form onSubmit={handleSendInvites} className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                  className="flex-1 min-w-[200px] px-4 py-2 border border-slate-200 rounded-xl text-sm"
                />
                <button
                  type="submit"
                  disabled={sendingInvites}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  {sendingInvites ? 'Preparing…' : 'Prepare email invitation'}
                </button>
              </form>
              {inviteMessage && (
                <p className={`mt-2 text-sm ${inviteMessage.startsWith('Your email') ? 'text-green-600' : 'text-rose-600'}`}>
                  {inviteMessage}
                </p>
              )}
            </div>
          )}
          {isAdmin && !isCancelled && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
              <h2 className="font-semibold text-slate-900 mb-2">Cancel meeting</h2>
              <p className="text-sm text-slate-600 mb-3">
                Cancelling prevents new joins through the website. Share the change with invitees; it does not end an ongoing video call.
              </p>
              <input
                type="text"
                placeholder="Reason (optional)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full max-w-md px-4 py-2 border border-slate-200 rounded-xl text-sm mb-3"
              />
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-100 text-rose-700 font-medium rounded-xl hover:bg-rose-200 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {cancelling ? 'Cancelling...' : 'Cancel meeting'}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

