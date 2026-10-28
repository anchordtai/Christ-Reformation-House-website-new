import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Send } from 'lucide-react'
import { useFormSubmit } from '../hooks/useApi'
import { meetingsService } from '../services/api'
import { sanitizeHtml } from '../utils/security'
import Error from '../components/Error'
import MetaTags from '../components/MetaTags'

export default function MeetingSchedule() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    inviteEmails: '',
  })

  const { submit, loading, error } = useFormSubmit(async (data) => {
    const payload = {
      title: sanitizeHtml(data.title),
      description: sanitizeHtml(data.description),
      startTime: new Date(data.startTime).toISOString(),
      endTime: new Date(data.endTime).toISOString(),
      inviteEmails: [],
    }
    const res = await meetingsService.create(payload)
    const id = res?.data?.id
    const joinToken = res?.data?.joinToken
    if (id) {
      const query = joinToken ? `?token=${joinToken}` : ''
      navigate(`/meetings/${id}${query}`)
    }
    return res
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    submit(formData)
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <MetaTags title="Schedule Meeting" description="Schedule a meeting or prayer service." />

      <section className="bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white py-10">
        <div className="container-custom">
          <h1 className="text-3xl sm:text-4xl font-bold">Schedule a meeting</h1>
          <p className="text-slate-300 mt-2">Create a meeting, then share its join link with members.</p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom max-w-2xl">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <Error message={error} />}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Title *</label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Prayer service"
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
                  placeholder="Agenda or notes"
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
              <p className="text-sm text-slate-500">Times use your device timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}). After creating the meeting, copy its join link or prepare an email invitation.</p>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-semibold rounded-xl"
              >
                <Send className="w-5 h-5" />
                {loading ? 'Creating...' : 'Create meeting'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}

