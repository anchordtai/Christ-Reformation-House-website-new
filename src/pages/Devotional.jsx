import { useState } from 'react'
import { devotionalService } from '../services/api'
import { useApi } from '../hooks/useApi'
import Loading from '../components/Loading'
import Error from '../components/Error'
export default function Devotional() {
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'))
  const { data, loading, error, refetch } = useApi(() => devotionalService.getByDate(date), [date])
  const item = Array.isArray(data) ? data[0] : null
  return <div><section className="section-padding bg-slate-950 text-white"><div className="container-custom"><h1 className="text-4xl font-bold">Daily devotional</h1><label className="mt-6 block">Choose a date<input aria-label="Devotional date" type="date" value={date} onChange={e => setDate(e.target.value)} className="ml-4 rounded-lg p-3 text-slate-900" /></label></div></section><section className="section-padding"><div className="max-w-3xl mx-auto">{loading ? <Loading /> : error ? <><Error message={error} /><button onClick={refetch} className="btn-primary mt-4">Try again</button></> : !item ? <p>No devotional has been published for this date.</p> : <article className="card"><h2 className="text-3xl font-bold">{item.title}</h2><p className="mt-5 font-semibold">{item.scripture}</p><blockquote className="mt-3 text-slate-600">{item.scriptureText}</blockquote><p className="mt-8 whitespace-pre-wrap leading-relaxed">{item.content}</p>{item.prayer && <div className="mt-8 rounded-xl bg-amber-50 p-5"><h3 className="font-semibold">Prayer</h3><p className="mt-3 whitespace-pre-wrap">{item.prayer}</p></div>}</article>}</div></section></div>
}
