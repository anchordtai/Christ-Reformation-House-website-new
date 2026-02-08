import { useParams, Link } from 'react-router-dom'
import { Play, Calendar, User, ArrowLeft, Clock, BookOpen, Share2 } from 'lucide-react'
import { format } from 'date-fns'
import { useApi } from '../hooks/useApi'
import { sermonService } from '../services/api'
import Loading from '../components/Loading'

const defaultSermon = (id) => ({
  id: parseInt(id),
  title: 'The Power of Faith',
  speaker: 'Pastor John Doe',
  date: new Date('2024-01-15'),
  duration: '45 min',
  image: '/assets/img/bible.jpeg',
  description: 'Exploring how faith transforms our lives and circumstances.',
  category: 'Faith',
  videoUrl: '',
  transcript: `In this powerful message, we explore the transformative power of faith. 
Faith is not just believing in something we cannot see, but it's an active trust in God's 
promises and His character. When we exercise faith, we open ourselves to God's miraculous 
work in our lives.`,
  scripture: 'Hebrews 11:1 - Now faith is the substance of things hoped for, the evidence of things not seen.',
})

const SermonDetail = () => {
  const { id } = useParams()
  const { data: sermon, loading, error } = useApi(() => sermonService.getById(id), [id])

  const sermonData = sermon || defaultSermon(id)
  const dateObj = sermonData.date ? new Date(sermonData.date) : null

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: sermonData.title,
        text: sermonData.description,
        url: window.location.href,
      }).catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  if (loading && !sermon) return <Loading message="Loading sermon..." />
  // When API fails (e.g. no backend), we still show content using default sermon

  return (
    <div className="min-h-screen bg-[#fafbfc]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 30% 20%, rgba(99, 102, 241, 0.25) 0%, transparent 50%),
                             radial-gradient(circle at 70% 70%, rgba(139, 92, 246, 0.2) 0%, transparent 40%)`,
          }}
        />
        <div className="container-custom section-padding relative z-10">
          <Link
            to="/sermons"
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white text-sm font-medium mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sermons
          </Link>
          {sermonData.category && (
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 text-indigo-200 text-sm font-semibold mb-4">
              {sermonData.category}
            </span>
          )}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight max-w-4xl">
            {sermonData.title}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-6 text-slate-300">
            {sermonData.speaker && (
              <span className="flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-300" />
                {sermonData.speaker}
              </span>
            )}
            {dateObj && (
              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-300" />
                {format(dateObj, 'MMMM d, yyyy')}
              </span>
            )}
            {sermonData.duration && (
              <span className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-300" />
                {sermonData.duration}
              </span>
            )}
            <button
              onClick={handleShare}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
              aria-label="Share"
            >
              <Share2 className="w-5 h-5" />
              Share
            </button>
          </div>
        </div>
      </section>

      {/* Video / thumbnail */}
      <section className="section-padding pt-10">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 shadow-2xl border border-slate-200/50 aspect-video">
              {sermonData.videoUrl ? (
                <iframe
                  src={sermonData.videoUrl}
                  title={sermonData.title}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={sermonData.image || '/assets/img/bible.jpeg'}
                    alt={sermonData.title}
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-black/40" />
                  <a
                    href={sermonData.videoUrl || '#'}
                    className="absolute inset-0 flex items-center justify-center group"
                  >
                    <span className="flex items-center justify-center w-20 h-20 rounded-full bg-white/95 text-indigo-600 shadow-2xl group-hover:scale-110 transition-transform duration-300">
                      <Play className="w-10 h-10 ml-1" fill="currentColor" />
                    </span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="section-padding pt-0">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto space-y-8">
            {sermonData.scripture && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-indigo-50 border-b border-slate-100 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Scripture</h2>
                </div>
                <p className="p-6 text-lg text-slate-700 italic border-l-4 border-indigo-500 pl-6">
                  {sermonData.scripture}
                </p>
              </div>
            )}

            {sermonData.description && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <h2 className="px-6 py-4 bg-slate-50 border-b border-slate-100 text-lg font-semibold text-slate-900">
                  About this message
                </h2>
                <p className="p-6 text-slate-700 leading-relaxed">
                  {sermonData.description}
                </p>
              </div>
            )}

            {sermonData.transcript && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <h2 className="px-6 py-4 bg-slate-50 border-b border-slate-100 text-lg font-semibold text-slate-900">
                  Transcript
                </h2>
                <div className="p-6">
                  <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                    {sermonData.transcript}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default SermonDetail
