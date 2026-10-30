export const MEETING_PROVIDER = 'https://meet.jit.si'
export const PUBLIC_MEETING_LIMIT_MINUTES = 95
export const validRoom = value => /^[a-z0-9][a-z0-9_-]{5,99}$/i.test(value || '')

export function newMeetingRoom(secureCrypto = globalThis.crypto) {
  if (!secureCrypto?.getRandomValues) throw new Error('Secure meeting links are unavailable in this browser. Please use a current browser over HTTPS.')
  const bytes = secureCrypto.getRandomValues(new Uint8Array(16))
  return `crh-${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`
}
export function meetingLink(room, origin, title = '') {
  if (!validRoom(room)) throw new Error('The meeting code is invalid.')
  const base = new URL(origin)
  if (!['https:', 'http:'].includes(base.protocol)) throw new Error('Invalid website address.')
  const url = new URL(`/meetings/room/${encodeURIComponent(room)}`, base.origin)
  if (title.trim()) url.searchParams.set('title', title.trim().slice(0, 100))
  return url.href
}
export function parseMeetingInput(input, origin) {
  const value = String(input || '').trim()
  if (validRoom(value)) return { room: value, title: '' }
  let url
  try { url = new URL(value) } catch { throw new Error('Paste the full invitation link or the meeting code from your host.') }
  const own = new URL(origin)
  const ownLink = url.origin === own.origin && ['https:', 'http:'].includes(own.protocol)
  if ((!ownLink && (url.protocol !== 'https:' || url.port)) || url.username || url.password) throw new Error('Use a secure invitation link from your host.')
  let room
  if (url.origin === own.origin) room = url.pathname.match(/^\/meetings\/room\/([^/]+)\/?$/)?.[1]
  else if (url.origin === MEETING_PROVIDER) room = url.pathname.match(/^\/([^/]+)\/?$/)?.[1]
  if (!validRoom(room)) throw new Error('This invitation is not a supported church meeting link. Ask your host for the complete invitation.')
  const parsed = { room, title: url.origin === own.origin ? (url.searchParams.get('title') || '').slice(0, 100) : '' }
  if(url.origin === MEETING_PROVIDER || (ownLink && url.searchParams.get('provider') === 'public')) parsed.publicProvider = true
  return parsed
}
export function providerMeetingLink(room) {
  if (!validRoom(room)) throw new Error('The meeting code is invalid.')
  return `${MEETING_PROVIDER}/${encodeURIComponent(room)}#config.startWithAudioMuted=true&config.startWithVideoMuted=true`
}
const calendarEscape = value => String(value).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
// RFC 5545 content lines are limited to 75 UTF-8 octets, including the
// continuation space. Iterate characters so multibyte names are not split.
const foldCalendarLine = line => {
  const encoder = new TextEncoder()
  const lines = []; let current = ''; let length = 0
  for (const character of line) {
    const bytes = encoder.encode(character).length
    if (length + bytes > 75) { lines.push(current); current = ' '; length = 1 }
    current += character; length += bytes
  }
  lines.push(current)
  return lines.join('\r\n')
}
export function meetingCalendar({ room, title, start, duration = 60, url }) {
  if (!validRoom(room) || !Number.isFinite(new Date(start).getTime()) || !Number.isInteger(duration) || duration < 15 || duration > PUBLIC_MEETING_LIMIT_MINUTES) throw new Error('Choose a valid start time and a duration between 15 and 95 minutes.')
  const invitation = new URL(url)
  if (!['http:', 'https:'].includes(invitation.protocol) || invitation.username || invitation.password) throw new Error('Invalid invitation URL.')
  const date = value => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const startDate = new Date(start)
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CRH//Meeting Invitation//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${room}@christreformationhouse.org.ng`, `DTSTAMP:${date(new Date())}`, `DTSTART:${date(startDate)}`, `DTEND:${date(startDate.getTime() + duration * 60000)}`, `SUMMARY:${calendarEscape(title || 'CRH Online Fellowship')}`, `DESCRIPTION:${calendarEscape('Join with the invitation link. The host must start the room first. ' + url)}`, `URL:${calendarEscape(url)}`, 'END:VEVENT', 'END:VCALENDAR', ''].map(foldCalendarLine).join('\r\n')
}
