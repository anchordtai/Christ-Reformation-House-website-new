import { LIVE_STREAM_CONFIG } from '../../utils/constants'
export default function VideoPlayer({ url, videoId, className = '' }) {
  let source = url
  if (!source && (videoId || LIVE_STREAM_CONFIG.FACEBOOK_VIDEO_ID)) source = `https://www.facebook.com/watch/?v=${encodeURIComponent(videoId || LIVE_STREAM_CONFIG.FACEBOOK_VIDEO_ID)}`
  if (!source) return <div className={`aspect-video rounded-2xl bg-slate-900 p-8 flex items-center justify-center text-center text-slate-300 ${className}`}>No online service is scheduled here yet. Please check back or contact the ministry.</div>
  let embed
  try {
    const parsed = new URL(source)
    if (parsed.protocol !== 'https:') throw new Error('Invalid stream')
    if (['www.youtube.com','youtube.com','youtu.be'].includes(parsed.hostname)) {
      const id = parsed.hostname === 'youtu.be' ? parsed.pathname.slice(1) : parsed.searchParams.get('v') || parsed.pathname.split('/').at(-1)
      if (/^[a-zA-Z0-9_-]{11}$/.test(id)) embed = `https://www.youtube-nocookie.com/embed/${id}`
    }
    if (['www.facebook.com','facebook.com','web.facebook.com'].includes(parsed.hostname)) embed = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(source)}&show_text=false`
  } catch { return <p className="rounded-xl bg-slate-100 p-8">This stream link is unavailable. Please contact the ministry.</p> }
  return embed ? <div className={`relative aspect-video rounded-2xl bg-black overflow-hidden ${className}`}><iframe src={embed} title="Ministry online service" className="absolute inset-0 h-full w-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen /></div> : <a href={source} target="_blank" rel="noopener noreferrer" className="btn-primary inline-block">Open the online service</a>
}
