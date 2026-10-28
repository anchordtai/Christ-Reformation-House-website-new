import { useEffect, useRef, useState } from 'react'
import { Loader2, RefreshCw, ExternalLink } from 'lucide-react'
import { MEETING_CONFIG } from '../../utils/constants'

export default function JitsiMeeting({ roomName, displayName = 'Guest', subject = '', domain = MEETING_CONFIG.JITSI_DOMAIN, onReady, onParticipantJoined, onParticipantLeft, className = '' }) {
  const container = useRef(null)
  const callbacks = useRef({ onReady, onParticipantJoined, onParticipantLeft })
  callbacks.current = { onReady, onParticipantJoined, onParticipantLeft }
  const [state, setState] = useState('loading')
  const [attempt, setAttempt] = useState(0)
  const valid = /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(domain) && /^[a-z0-9-]{6,100}$/i.test(roomName || '')
  const joinUrl = valid ? `https://${domain}/${encodeURIComponent(roomName)}` : null
  useEffect(() => {
    if (!valid || !container.current) { setState('error'); return }
    let disposed = false
    let api
    const script = document.createElement('script')
    const host = container.current
    setState('loading')
    const timer = setTimeout(() => { if (!disposed) setState('error') }, 20000)
    script.src = `https://${domain}/external_api.js`
    script.async = true
    script.onerror = () => { if (!disposed) { clearTimeout(timer); setState('error') } }
    script.onload = () => {
      if (disposed) return
      try {
        if (!window.JitsiMeetExternalAPI) throw new Error('Meeting library unavailable')
        api = new window.JitsiMeetExternalAPI(domain, {
          roomName, parentNode: host, width: '100%', height: '100%', userInfo: { displayName },
          configOverwrite: {
            startWithAudioMuted: true, startWithVideoMuted: true, prejoinPageEnabled: true,
            disableDeepLinking: true, subject,
            toolbarButtons: ['microphone', 'camera', 'desktop', 'chat', 'participants-pane', 'raisehand', 'tileview', 'settings', 'fullscreen', 'invite', 'security', 'hangup'],
          },
          onload: () => { if (!disposed) { clearTimeout(timer); setState('ready') } },
        })
        api.addEventListener('videoConferenceJoined', event => callbacks.current.onReady?.(event))
        api.addEventListener('participantJoined', event => callbacks.current.onParticipantJoined?.(event))
        api.addEventListener('participantLeft', event => callbacks.current.onParticipantLeft?.(event))
        api.addEventListener('readyToClose', () => { if (!disposed) setState('ended') })
      } catch { clearTimeout(timer); setState('error') }
    }
    document.body.appendChild(script)
    return () => {
      disposed = true; clearTimeout(timer); script.onload = null; script.onerror = null
      api?.dispose(); script.remove(); host.replaceChildren()
    }
  }, [roomName, displayName, subject, domain, attempt, valid])
  return <div className={className}>
    <div className="bg-slate-800 p-3 text-xs text-slate-300">Allow camera and microphone when prompted. On the public Jitsi service, the host may need to sign in to start the meeting. <a href={joinUrl || '#'} target="_blank" rel="noopener noreferrer" className="underline ml-2">Open meeting separately</a></div>
    <div className="relative bg-slate-950" style={{ height: '72dvh', minHeight: 480 }}>
      <div ref={container} className="h-full w-full" />
      {state !== 'ready' && <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-slate-950 p-8 text-center text-slate-200">
        {state === 'loading' ? <><Loader2 className="animate-spin" /><p>Preparing your meeting…</p></> : <><p>{state === 'ended' ? 'You have left the meeting.' : 'The meeting could not load here. Retry or open it in a separate tab.'}</p><button className="btn-primary inline-flex gap-2" onClick={() => setAttempt(n => n + 1)}><RefreshCw size={18} />{state === 'ended' ? 'Rejoin' : 'Retry'}</button>{joinUrl && <a href={joinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex gap-2 underline"><ExternalLink size={18} />Open meeting</a>}</>}
      </div>}
    </div>
  </div>
}
