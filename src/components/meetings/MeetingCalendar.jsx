import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function MeetingCalendar({ meetings, currentMonth, onMonthChange }) {
  const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth])
  const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth])
  const days = useMemo(
    () => eachDayOfInterval({ start: monthStart, end: monthEnd }),
    [monthStart, monthEnd]
  )

  const meetingsByDate = useMemo(() => {
    const map = {}
    meetings.forEach((m) => {
      if (!m.startTime) return
      const d = format(new Date(m.startTime), 'yyyy-MM-dd')
      if (!map[d]) map[d] = []
      if (m.status !== 'cancelled') map[d].push(m)
    })
    return map
  }, [meetings])

  const startPad = monthStart.getDay()
  const padDays = Array.from({ length: startPad }, (_, i) => null)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <button
          type="button"
          onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="font-semibold text-slate-900">{format(currentMonth, 'MMMM yyyy')}</h3>
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 font-medium mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {padDays.map((_, i) => <div key={`pad-${i}`} />)}
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayMeetings = meetingsByDate[key] || []
            return (
              <div
                key={key}
                className={`min-h-[80px] p-1 rounded-lg border ${
                  isSameMonth(day, currentMonth) ? 'bg-slate-50 border-slate-100' : 'bg-white border-transparent'
                }`}
              >
                <div className="text-slate-600 text-sm font-medium">{format(day, 'd')}</div>
                <div className="mt-1 space-y-1">
                  {dayMeetings.slice(0, 2).map((m) => (
                    <Link
                      key={m.id}
                      to={`/meetings/${m.id}`}
                      className="block truncate text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                    >
                      {m.title}
                    </Link>
                  ))}
                  {dayMeetings.length > 2 && (
                    <span className="text-xs text-slate-400">+{dayMeetings.length - 2}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
