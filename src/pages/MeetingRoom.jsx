import { useParams, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, Video, Users } from 'lucide-react'
import { useState, useCallback } from 'react'
import { useApi } from '../hooks/useApi'
import { meetingsService } from '../services/api'
import { useAuth } from '../context/AuthContext'
import JitsiMeeting from '../components/meetings/JitsiMeeting'
import Loading from '../components/Loading'
import Error from '../components/Error'
import MetaTags from '../components/MetaTags'

/**
 * Meeting room: Jitsi Meet embed (video, audio, chat, screen share).
 * Supports secure join via ?token= in URL. Backend returns url and optionally roomName for embed.
 */
export default function MeetingRoom() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { user } = useAuth()
  const displayName = user?.name || user?.email?.split('@')[0] || 'Guest'

  const { data, loading, error } = useApi(
    () => meetingsService.getJoinUrl(id, token || undefined),
    [id, token]
  )

  const [participantNotifications, setParticipantNotifications] = useState([])
  const joinPayload = data?.data || data
  const joinUrl = joinPayload?.url
  const roomName = joinPayload?.roomName
  const useEmbed = joinPayload?.useEmbed !== false && (roomName || (joinUrl && (joinUrl.includes('meet.jit.si') || joinUrl.includes('8x8.vc'))))

  const handleParticipantJoined = useCallback((e) => {
    const name = e?.displayName || e?.participant?.getDisplayName?.() || 'Someone'
    const id = Date.now()
    setParticipantNotifications((prev) => [...prev.slice(-4), { id, text: `${name} joined` }])
    setTimeout(() => setParticipantNotifications((p) => p.filter((n) => n.id !== id)), 4000)
  }, [])

  const handleParticipantLeft = useCallback((e) => {
    const name = e?.displayName || e?.participant?.getDisplayName?.() || 'Someone'
    const id = Date.now()
    setParticipantNotifications((prev) => [...prev.slice(-4), { id, text: `${name} left` }])
    setTimeout(() => setParticipantNotifications((p) => p.filter((n) => n.id !== id)), 4000)
  }, [])

  if (loading) return <Loading message="Loading meeting..." />
  if (error) return <Error message={error} />

  const jitsiRoomName = roomName || (joinUrl && joinUrl.includes('meet.jit.si') ? new URL(joinUrl).pathname.slice(1).replace(/\?.*/, '') : null)

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <MetaTags title="Meeting" description="Join the meeting." />

      <header className="flex items-center justify-between p-4 bg-slate-800/80 border-b border-slate-700 shrink-0">
        <Link
          to="/meetings"
          className="flex items-center gap-2 text-slate-300 hover:text-white text-sm font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to meetings
        </Link>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Users className="w-4 h-4" />
          <span>Video, audio, chat & screen share</span>
        </div>
      </header>

      {/* Toast notifications for participant join/leave (when using Jitsi API) */}
      {participantNotifications.length > 0 && (
        <div className="fixed bottom-4 left-4 z-50 space-y-2">
          {participantNotifications.map((n) => (
            <div
              key={n.id}
              className="px-4 py-2 rounded-lg bg-slate-800/95 border border-slate-600 text-slate-200 text-sm shadow-lg"
            >
              {n.text}
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0">
        {useEmbed && jitsiRoomName ? (
          <JitsiMeeting
            roomName={jitsiRoomName}
            displayName={displayName}
            subject={joinPayload?.subject}
            onParticipantJoined={handleParticipantJoined}
            onParticipantLeft={handleParticipantLeft}
            className="flex-1 min-h-0"
          />
        ) : joinUrl ? (
          <>
            {(joinUrl.includes('meet.jit.si') || joinUrl.includes('8x8.vc')) && !jitsiRoomName ? (
              <iframe
                src={joinUrl}
                title="Meeting"
                className="flex-1 w-full min-h-[400px] border-0"
                allow="camera; microphone; fullscreen; display-capture"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <a
                  href={joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"
                >
                  <Video className="w-5 h-5" />
                  Join meeting (opens in new tab)
                </a>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 p-8 text-center">
            <p>No join URL configured. Backend should return meeting URL from GET /meetings/:id/join</p>
            <p className="text-sm mt-2">Include ?token= for secure links.</p>
          </div>
        )}
      </div>
    </div>
  )
}
