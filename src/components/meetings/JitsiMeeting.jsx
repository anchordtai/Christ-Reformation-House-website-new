import { useEffect, useRef } from 'react'
import { MEETING_CONFIG, APP_CONFIG } from '../../utils/constants'

/**
 * Embeds Jitsi Meet with config for video, audio, chat, screen share.
 * Jitsi provides: mute/unmute, camera on/off, speaker view, screen sharing, chat, participant list.
 * Optional: load Jitsi external API for more control (recording, breakout rooms).
 */
export default function JitsiMeeting({
  roomName,
  displayName = 'Guest',
  password = '',
  subject = '',
  onReady,
  onParticipantJoined,
  onParticipantLeft,
  className = '',
}) {
  const containerRef = useRef(null)
  const apiRef = useRef(null)
  const domain = MEETING_CONFIG.JITSI_DOMAIN

  useEffect(() => {
    if (!roomName || !containerRef.current) return

    let script = document.createElement('script')
    script.src = `https://${domain}/external_api.js`
    script.async = true
    script.onload = () => {
      const JitsiMeetExternalAPI = window.JitsiMeetExternalAPI
      if (!JitsiMeetExternalAPI) return

      const options = {
        roomName: roomName.replace(/\s+/g, '-'),
        width: '100%',
        height: '100%',
        parent: containerRef.current,
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          enableWelcomePage: false,
          prejoinPageEnabled: true,
          disableDeepLinking: true,
          subject: subject || undefined,
          defaultLanguage: 'en',
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_LOGO_URL: MEETING_CONFIG.DEFAULT_AVATAR,
          DEFAULT_WELCOME_PAGE_LOGO_URL: MEETING_CONFIG.DEFAULT_AVATAR,
          APP_NAME: MEETING_CONFIG.APP_NAME || APP_CONFIG.CHURCH_NAME,
          NATIVE_APP_NAME: MEETING_CONFIG.APP_NAME,
          DISPLAY_WELCOME_PAGE_CONTENT: true,
          TOOLBAR_BUTTONS: [
            'microphone',
            'camera',
            'closedcaptions',
            'desktop',
            'embedmeeting',
            'fullscreen',
            'fodeviceselection',
            'hangup',
            'profile',
            'chat',
            'recording',
            'livestreaming',
            'etherpad',
            'sharedvideo',
            'settings',
            'raisehand',
            'videoquality',
            'filmstrip',
            'invite',
            'feedback',
            'stats',
            'shortcuts',
            'tileview',
            'videobackgroundblur',
            'download',
            'help',
            'mute-everyone',
            'security',
          ],
        },
        userInfo: {
          displayName,
        },
      }
      if (password) options.password = password

      const api = new JitsiMeetExternalAPI(domain, options)
      apiRef.current = api
      if (onReady) api.addEventListener('videoConferenceJoined', onReady)
      if (onParticipantJoined) api.addEventListener('participantJoined', onParticipantJoined)
      if (onParticipantLeft) api.addEventListener('participantLeft', onParticipantLeft)
    }
    document.body.appendChild(script)

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose()
        apiRef.current = null
      }
      if (script.parentNode) script.parentNode.removeChild(script)
    }
  }, [roomName, domain, displayName, password, subject, onReady, onParticipantJoined, onParticipantLeft])

  return (
    <div ref={containerRef} className={`jitsi-meet-embed ${className}`} style={{ height: '100%', minHeight: 480 }} />
  )
}
