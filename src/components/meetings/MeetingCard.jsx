import { Link } from 'react-router-dom'
import { Video, Clock, Calendar, Share2, Edit2, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../../context/AuthContext'
import ShareMeeting from './ShareMeeting'

export default function MeetingCard({ meeting, onCancel, onRefetch }) {
  const { isAdmin } = useAuth()
  const start = meeting.startTime ? new Date(meeting.startTime) : null
  const end = meeting.endTime ? new Date(meeting.endTime) : null
  const isCancelled = meeting.status === 'cancelled'
  const isPast = end && end < new Date()

  const duration = start && end
    ? `${Math.round((end - start) / 60000)} min`
    : null

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md ${
        isCancelled ? 'border-slate-200 opacity-75' : 'border-slate-200'
      }`}
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900 flex-1">{meeting.title}</h3>
          {isCancelled && (
            <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-600 text-xs font-medium">
              Cancelled
            </span>
          )}
          {isPast && !isCancelled && (
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
              Ended
            </span>
          )}
        </div>
        {meeting.description && (
          <p className="text-sm text-slate-500 mt-1 line-clamp-2">{meeting.description}</p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
          {start && (
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              {format(start, 'EEE, MMM d')}
            </span>
          )}
          {start && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              {format(start, 'h:mm a')}
              {duration && ` · ${duration}`}
            </span>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {!isCancelled && !isPast && (
            <Link
              to={`/meetings/room/${meeting.id}${meeting.joinToken ? `?token=${meeting.joinToken}` : ''}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Video className="w-4 h-4" />
              Join meeting
            </Link>
          )}
          <Link
            to={`/meetings/${meeting.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors"
          >
            View details
          </Link>
          <ShareMeeting meeting={meeting} />
        </div>
        {isAdmin && !isCancelled && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
            <Link
              to={`/meetings/${meeting.id}/edit`}
              className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </Link>
            {onCancel && (
              <button
                type="button"
                onClick={() => onCancel(meeting.id)}
                className="inline-flex items-center gap-1.5 text-sm text-rose-600 hover:underline"
              >
                <Trash2 className="w-4 h-4" />
                Cancel meeting
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
