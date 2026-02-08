import { useState, useEffect } from 'react'
import { MessageCircle } from 'lucide-react'
import { liveStreamService } from '../../services/api'
import { sanitizeHtml } from '../../utils/security'
import { LIVE_STREAM_CONFIG } from '../../utils/constants'

/**
 * Live comments feed. Backend should proxy Facebook Graph API comments for the video.
 * Falls back to empty state when no API or no comments.
 */
export default function LiveComments({ videoId, pollInterval = 15000 }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const id = videoId || LIVE_STREAM_CONFIG.FACEBOOK_VIDEO_ID

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }

    const fetchComments = async () => {
      try {
        const res = await liveStreamService.getComments(id)
        setComments(Array.isArray(res?.data) ? res.data : [])
        setError(null)
      } catch (err) {
        setError(err.message || 'Failed to load comments')
        setComments([])
      } finally {
        setLoading(false)
      }
    }

    fetchComments()
    const interval = setInterval(fetchComments, pollInterval)
    return () => clearInterval(interval)
  }, [id, pollInterval])

  if (!id) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 text-slate-500 mb-4">
          <MessageCircle className="w-5 h-5" />
          <h3 className="font-semibold">Live Comments</h3>
        </div>
        <p className="text-sm text-slate-400">Configure video ID to show Facebook comments.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[280px]">
      <div className="flex items-center gap-2 p-4 border-b border-slate-100">
        <MessageCircle className="w-5 h-5 text-indigo-600" />
        <h3 className="font-semibold text-slate-900">Live Comments</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && <p className="text-sm text-slate-400">Loading comments...</p>}
        {error && <p className="text-sm text-amber-600">{error}</p>}
        {!loading && !error && comments.length === 0 && (
          <p className="text-sm text-slate-400">No comments yet. Be the first to say something!</p>
        )}
        {comments.map((c) => (
          <div key={c.id || c.message} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-600 text-sm font-medium">
              {(c.from?.name || '?')[0]}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">{sanitizeHtml(c.from?.name || 'Guest')}</p>
              <p className="text-sm text-slate-600">{sanitizeHtml(c.message)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
