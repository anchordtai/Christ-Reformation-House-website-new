export const eventDate = value => new Intl.DateTimeFormat('en-NG',{timeZone:'Africa/Lagos',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(value))
export const eventTime = value => new Intl.DateTimeFormat('en-NG',{timeZone:'Africa/Lagos',hour:'numeric',minute:'2-digit'}).format(new Date(value))
export function nigeriaInput(value) {
  if (!value) return ''
  const parts = new Intl.DateTimeFormat('sv-SE',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value))
  return parts.replace(' ','T')
}
export function fromNigeriaInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Choose the event start and end times.')
  const result = new Date(value + ':00+01:00').toISOString()
  if(nigeriaInput(result)!==value)throw new Error('Choose valid event dates.')
  return result
}
export function downloadEventCalendar(event) {
  const escape = value => String(value).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;')
  const stamp = value => new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z')
  const encoder = new TextEncoder()
  const fold = line => {let result='',size=0;for(const char of line){const bytes=encoder.encode(char).length;if(size+bytes>75){result+='\r\n ';size=1}result+=char;size+=bytes}return result}
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CRH//Events//EN','BEGIN:VEVENT',`UID:${event.id}@christreformationhouse.org.ng`,`DTSTAMP:${stamp(Date.now())}`,`DTSTART:${stamp(event.starts_at)}`,`DTEND:${stamp(event.ends_at)}`,`SUMMARY:${escape(event.title)}`,`LOCATION:${escape(event.location)}`,`DESCRIPTION:${escape(event.description)}`,`URL:${escape(window.location.origin+'/events/register/'+event.id)}`,'END:VEVENT','END:VCALENDAR','']
  const url = URL.createObjectURL(new Blob([lines.map(fold).join('\r\n')],{type:'text/calendar;charset=utf-8'}))
  const a=document.createElement('a');a.href=url;a.download='crh-event.ics';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
