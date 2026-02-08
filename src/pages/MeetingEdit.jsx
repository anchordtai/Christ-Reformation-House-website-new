import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { meetingsService } from '../services/api'
import { sanitizeHtml } from '../utils/security'
import Error from '../components/Error'
import Loading from '../components/Loading'
import MetaTags from '../components/MetaTags'

export default function MeetingEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: meeting, loading: loadMeeting, error: loadError } = useApi(() => meetingsService.getById(id), [id])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    if (!meeting) return
    const start = meeting.startTime ? new Date(meeting.startTime).toISOString().slice(0, 16) : ''
    const end = meeting.endTime ? new Date(meeting.endTime).toISOString().slice(0, 16) : ''
    setFormData({
      title: meeting.title || '',
      description: meeting.description || '',
      startTime: start,
      endTime: end,
    })
  }, [meeting])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaveError(null)
    setSaving(true)
    try {
      await meetingsService.update(id, {
        title: sanitizeHtml(formData.title),
        description: sanitizeHtml(formData.description),
        startTime: formData.startTime,
        endTime: formData.endTime,
      })
      navigate(`/meetings/${id}`)
    } catch (err) {
      setSaveError(err.response?.data?.message || err.message || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  if (loadMeeting && !meeting) return <Loading message="Loading..." />
  if (loadError && !meeting) return <Error message={loadError} />
  if (!meeting) return null

  return (
    <div className="min-h-screen bg-slate-50">
      <MetaTags title={`Edit: ${meeting.title}`} description="Edit meeting" />

      <section className="bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white py-10">
        <div className="container-custom">
          <h1 className="text-3xl sm:text-4xl font-bold">Edit meeting</h1>
          <p className="text-slate-300 mt-2">Update details. Invitees can be re-notified from the meeting detail page.</p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom max-w-2xl">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
            {saveError && <Error message={saveError} />}
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
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Start *</label>
                  <input
                    type="datetime-local"
                    name="startTime"
                    required
                    value={formData.startTime}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">End *</label>
                  <input
                    type="datetime-local"
                    name="endTime"
                    required
                    value={formData.endTime}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-semibold rounded-xl"
              >
                <Send className="w-5 h-5" />
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}
