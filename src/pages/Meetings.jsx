import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Plus, LayoutList, CalendarDays } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import { meetingsService } from '../services/api'
import MeetingCard from '../components/meetings/MeetingCard'
import MeetingCalendar from '../components/meetings/MeetingCalendar'
import Loading from '../components/Loading'
import Error from '../components/Error'
import MetaTags from '../components/MetaTags'

export default function Meetings() {
  const { isAdmin } = useAuth()
  const [viewMode, setViewMode] = useState('list')
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const { data, loading, error, refetch } = useApi(() => meetingsService.getAll(), [])
  const meetings = Array.isArray(data) ? data : []

  const upcoming = meetings.filter((m) => {
    if (m.status === 'cancelled') return false
    const end = m.endTime ? new Date(m.endTime) : null
    return !end || end >= new Date()
  })
  const past = meetings.filter((m) => {
    const end = m.endTime ? new Date(m.endTime) : null
    return end && end < new Date()
  })

  const handleCancel = async (meetingId) => {
    if (!window.confirm('Cancel this meeting?')) return
    try {
      await meetingsService.cancel(meetingId)
      refetch?.()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <MetaTags title="Meetings & Prayer" description="Schedule and join meetings and prayer services." />

      <section className="bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white py-12">
        <div className="container-custom">
          <h1 className="text-3xl sm:text-4xl font-bold">Meetings & Prayer</h1>
          <p className="text-slate-300 mt-2">
            {isAdmin
              ? 'Schedule a meeting or join a prayer service online.'
              : 'Join upcoming meetings and prayer services online.'}
          </p>
          {isAdmin && (
            <Link
              to="/meetings/schedule"
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-slate-100 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Schedule meeting
            </Link>
          )}
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom">
          {loading && <Loading message="Loading meetings..." />}
          {error && <Error message={error} />}

          {!loading && !error && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex rounded-xl border border-slate-200 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <LayoutList className="w-4 h-4" />
                    List
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('calendar')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      viewMode === 'calendar' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <CalendarDays className="w-4 h-4" />
                    Calendar
                  </button>
                </div>
              </div>

              {meetings.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">No upcoming meetings.</p>
                  {isAdmin && (
                    <Link
                      to="/meetings/schedule"
                      className="mt-4 inline-block text-indigo-600 font-medium hover:underline"
                    >
                      Schedule one
                    </Link>
                  )}
                </div>
              )}

              {viewMode === 'calendar' && meetings.length > 0 && (
                <MeetingCalendar
                  meetings={meetings}
                  currentMonth={calendarMonth}
                  onMonthChange={setCalendarMonth}
                />
              )}

              {viewMode === 'list' && meetings.length > 0 && (
                <div className="space-y-6">
                  {upcoming.length > 0 && (
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900 mb-4">Upcoming</h2>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {upcoming.map((m) => (
                          <MeetingCard
                            key={m.id}
                            meeting={m}
                            onCancel={isAdmin ? handleCancel : undefined}
                            onRefetch={refetch}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {past.length > 0 && (
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900 mb-4">Past meetings</h2>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {past.map((m) => (
                          <MeetingCard key={m.id} meeting={m} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
