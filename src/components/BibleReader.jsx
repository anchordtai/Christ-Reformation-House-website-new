import { useEffect, useState } from 'react'
import books from '../content/bible-books.json'

const cache = new Map()
function readBook(id) {
  if (!cache.has(id)) cache.set(id, fetch(`/bible/kjv/${id}.json`).then(response => {
    if (!response.ok) throw new Error('Book unavailable')
    return response.json()
  }).then(data => {
    if (!Array.isArray(data) || !data.every(chapter => Array.isArray(chapter) && chapter.every(verse => typeof verse === 'string'))) throw new Error('Invalid Bible data')
    return data
  }).catch(error => { cache.delete(id); throw error }))
  return cache.get(id)
}

export default function BibleReader({ initialPassage = null }) {
  const [selection, setSelection] = useState(() => ({ book: initialPassage?.book || 43, chapter: initialPassage?.chapter || 1, verse: initialPassage?.verse || '', endChapter: initialPassage?.endChapter || null, endVerse: initialPassage?.endVerse || null }))
  const [data, setData] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const [retry, setRetry] = useState(0), [size, setSize] = useState(18), [notice, setNotice] = useState('')
  const { book, chapter, verse } = selection
  const selected = books.find(item => item.id === book)
  const endChapter = selection.endChapter || chapter
  const endVerse = selection.endVerse || Number(verse)
  const verses = data?.[chapter - 1] || []
  const invalidRange = data && (endChapter > data.length || (verse && (+verse > verses.length || endVerse > (data[endChapter - 1]?.length || 0))))
  const displayed = data && !invalidRange ? data.slice(chapter - 1, endChapter).flatMap((lines, offset) => lines.map((text, index) => ({ text, chapter: chapter + offset, verse: index + 1 })).filter(line => !verse || ((line.chapter !== chapter || line.verse >= +verse) && (line.chapter !== endChapter || line.verse <= endVerse)))) : []
  const reference = `${selected.name} ${chapter}${verse ? `:${verse}${endChapter !== chapter ? `–${endChapter}:${endVerse}` : endVerse !== +verse ? `–${endVerse}` : ''}` : ''}`

  useEffect(() => {
    let active = true
    setData(null); setLoading(true); setError(''); setNotice('')
    readBook(book).then(value => { if (active) setData(value) }).catch(() => {
      if (active) setError('Unable to load this Bible book. Check your connection and retry.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [book, retry])

  async function copy() {
    const text = `${reference} (KJV)\n` + displayed.map(line => `${line.chapter}:${line.verse}. ${line.text}`).join('\n')
    try { await navigator.clipboard.writeText(text); setNotice('Scripture copied.') }
    catch { setNotice('Select the scripture text to copy it in this browser.') }
  }
  function changeChapter(value) {
    setSelection({ book, chapter: value, verse: '', endChapter: null, endVerse: null }); setNotice('')
  }
  return <div className="crh-bible-reader" data-bible-ignore>
    <div className="crh-bible-selects">
      <label>Book<select value={book} onChange={e => setSelection({ book: +e.target.value, chapter: 1, verse: '', endChapter: null, endVerse: null })}>{books.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Chapter<select value={chapter} onChange={e => changeChapter(+e.target.value)}>{Array.from({ length: selected.chapters }, (_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}</select></label>
      <label>Verse<select value={verse} disabled={!data} onChange={e => { setSelection({ book, chapter, verse: e.target.value, endChapter: null, endVerse: null }); setNotice('') }}><option value="">All verses</option>{verses.map((_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}</select></label>
    </div>
    <div className="crh-bible-tools"><button aria-label="Smaller Bible text" disabled={size <= 16} onClick={() => setSize(value => value - 2)}>A−</button><button aria-label="Larger Bible text" disabled={size >= 28} onClick={() => setSize(value => value + 2)}>A+</button><button disabled={!data || invalidRange} onClick={copy}>Copy scripture</button></div>
    {loading && <p role="status">Loading {selected.name}…</p>}
    {error && <div role="alert"><p>{error}</p><button onClick={() => setRetry(value => value + 1)}>Retry Bible</button></div>}
    {invalidRange && <div className="bible-invalid" role="alert"><p>That verse range is not available in {selected.name}. Choose a verse above or read the whole chapter.</p><button onClick={() => changeChapter(chapter)}>Read the whole chapter</button></div>}
    {data && !invalidRange && <article className="crh-bible-text" style={{ fontSize: size }} aria-label={`${selected.name} chapter ${chapter}, King James Version`}><h3>{reference} <small>KJV</small></h3>{displayed.map(line => <p key={`${line.chapter}:${line.verse}`}><sup>{endChapter !== chapter ? `${line.chapter}:` : ''}{line.verse}</sup> {line.text}</p>)}</article>}
    <div className="crh-bible-tools"><button disabled={chapter === 1 || loading} onClick={() => changeChapter(chapter - 1)}>Previous chapter</button><button disabled={chapter === selected.chapters || loading} onClick={() => changeChapter(chapter + 1)}>Next chapter</button></div>
    {notice && <p role="status">{notice}</p>}
    <p className="crh-source-note">King James Version · <a href="/bible/kjv/SOURCE.md" target="_blank" rel="noopener noreferrer">Text source</a></p>
  </div>
}
