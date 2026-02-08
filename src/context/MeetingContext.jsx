import { createContext, useContext, useState, useCallback } from 'react'

const MeetingContext = createContext(null)

export function MeetingProvider({ children }) {
  const [meetings, setMeetings] = useState([])
  const [viewMode, setViewMode] = useState('list') // 'list' | 'calendar'

  const setMeetingsFromApi = useCallback((data) => {
    setMeetings(Array.isArray(data) ? data : [])
  }, [])

  const value = {
    meetings,
    setMeetings: setMeetingsFromApi,
    viewMode,
    setViewMode,
  }

  return (
    <MeetingContext.Provider value={value}>
      {children}
    </MeetingContext.Provider>
  )
}

export function useMeeting() {
  const ctx = useContext(MeetingContext)
  return ctx || { meetings: [], setMeetings: () => {}, viewMode: 'list', setViewMode: () => {} }
}
