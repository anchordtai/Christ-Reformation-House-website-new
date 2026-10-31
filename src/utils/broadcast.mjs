export const WATCH_URL = 'https://www.christreformationhouse.org.ng/watch'
export function youtubeId(value) {
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (/^[\w-]{11}$/.test(text)) return text
  try {
    const url = new URL(text)
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null
    let id
    if (url.hostname === 'youtu.be') id = url.pathname.slice(1)
    else if (['youtube.com','www.youtube.com','m.youtube.com'].includes(url.hostname)) {
      if (url.pathname === '/watch') id = url.searchParams.get('v')
      else if (/^\/(live|embed)\//.test(url.pathname)) id = url.pathname.split('/')[2]
    }
    return /^[\w-]{11}$/.test(id || '') ? id : null
  } catch { return null }
}
export function effectiveBroadcast(broadcast, now = Date.now()) {
  if (!broadcast || !['scheduled','live','replay'].includes(broadcast.state) || !youtubeId(broadcast.video_id)) return {state:'offline',title:broadcast?.title || 'Gather around the Word',description:broadcast?.description || ''}
  if (['live','scheduled'].includes(broadcast.state)) {
    if (!Number.isFinite(Date.parse(broadcast.ends_at)) || Date.parse(broadcast.ends_at) <= now) return {state:'offline',title:'This broadcast has ended',description:'Visit the ministry video library for previous messages.'}
    if (Date.parse(broadcast.starts_at) > now) return {...broadcast,state:'scheduled'}
  }
  return broadcast
}
export function broadcastCaption(title) { return `${title || 'Worship with Christ’s Reformation House'}\nWatch with us, read the Bible and support the ministry:\n${WATCH_URL}` }
