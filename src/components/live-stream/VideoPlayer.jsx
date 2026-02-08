import { LIVE_STREAM_CONFIG } from '../../utils/constants'

/**
 * Facebook Live embed via iframe.
 * Set VITE_FACEBOOK_VIDEO_ID or VITE_FACEBOOK_PAGE_ID in .env.
 * Alternative: backend can provide RTMP/HLS URL for a custom player (e.g. video.js).
 */
export default function VideoPlayer({ videoId, className = '' }) {
  const id = videoId || LIVE_STREAM_CONFIG.FACEBOOK_VIDEO_ID || LIVE_STREAM_CONFIG.FACEBOOK_PAGE_ID

  if (!id) {
    return (
      <div className={`aspect-video bg-slate-900 rounded-2xl flex items-center justify-center ${className}`}>
        <div className="text-center text-slate-400 p-8">
          <p className="font-medium">No live stream configured</p>
          <p className="text-sm mt-2">Set VITE_FACEBOOK_VIDEO_ID or VITE_FACEBOOK_PAGE_ID in .env</p>
        </div>
      </div>
    )
  }

  const embedUrl = `https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2F${id}%2Fvideos&width=500&height=280&show_text=false&appId=${LIVE_STREAM_CONFIG.FACEBOOK_APP_ID || ''}&responsive=true`

  return (
    <div className={`relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ${className}`}>
      <iframe
        src={embedUrl}
        title="Facebook Live"
        className="absolute inset-0 w-full h-full"
        allowFullScreen
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
      />
    </div>
  )
}
