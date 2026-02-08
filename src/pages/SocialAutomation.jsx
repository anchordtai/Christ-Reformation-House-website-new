import { useState } from 'react'
import { Share2, Send, Loader2 } from 'lucide-react'
import { useFormSubmit } from '../hooks/useApi'
import { socialAutomationService } from '../services/api'
import { sanitizeHtml } from '../utils/security'
import Error from '../components/Error'
import MetaTags from '../components/MetaTags'

/**
 * Admin-style UI to trigger a social post (daily blog/announcement).
 * Backend POST /social/post should use stored tokens and proxy to platforms.
 */
export default function SocialAutomation() {
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    link: '',
    imageUrl: '',
    platforms: { facebook: true, twitter: false, instagram: false, linkedin: false },
  })

  const { submit, loading, error, success } = useFormSubmit((data) =>
    socialAutomationService.postNow({
      title: sanitizeHtml(data.title),
      body: sanitizeHtml(data.body),
      link: data.link,
      imageUrl: data.imageUrl,
      platforms: data.platforms,
    })
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    submit(formData)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        platforms: { ...prev.platforms, [name]: checked },
      }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <MetaTags title="Social Post" description="Post to social media." />

      <section className="bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white py-10">
        <div className="container-custom">
          <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-3">
            <Share2 className="w-10 h-10" />
            Social automation
          </h1>
          <p className="text-slate-300 mt-2">Post announcements or daily content to your connected accounts.</p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom max-w-2xl">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
            {success && (
              <div className="mb-6 p-4 bg-green-50 text-green-800 rounded-xl">Post sent successfully.</div>
            )}
            {error && <Error message={error} />}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Title *</label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Body *</label>
                <textarea
                  name="body"
                  rows={4}
                  required
                  value={formData.body}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Link (optional)</label>
                <input
                  type="url"
                  name="link"
                  value={formData.link}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Image URL (optional)</label>
                <input
                  type="url"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Platforms</label>
                <div className="flex flex-wrap gap-4">
                  {['facebook', 'twitter', 'instagram', 'linkedin'].map((p) => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name={p}
                        checked={formData.platforms[p] || false}
                        onChange={handleChange}
                        className="text-indigo-600 rounded"
                      />
                      <span className="capitalize">{p}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-semibold rounded-xl"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {loading ? 'Posting...' : 'Post now'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}
