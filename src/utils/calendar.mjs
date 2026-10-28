const escape = value => String(value || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
const timestamp = value => { const date = new Date(value); if (!Number.isFinite(+date)) throw new Error('Meeting date is invalid'); return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z'); };
export function meetingCalendar(meeting, joinUrl, now = new Date()) {
  const url = new URL(joinUrl); if (url.protocol !== 'https:' && url.hostname !== 'localhost') throw new Error('Invalid meeting URL');
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CRH//Meeting Calendar//EN','BEGIN:VEVENT',`UID:${escape(meeting.id)}@crh`, `DTSTAMP:${timestamp(now)}`,`DTSTART:${timestamp(meeting.startTime)}`,`DTEND:${timestamp(meeting.endTime)}`,`SUMMARY:${escape(meeting.title)}`,`DESCRIPTION:${escape((meeting.description || '') + '\nJoin: ' + url.href)}`,`URL:${url.href}`,'END:VEVENT','END:VCALENDAR',''].join('\r\n');
}
