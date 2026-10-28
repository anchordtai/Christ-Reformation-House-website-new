import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, RefreshCw, Search } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import Loading from './Loading'
import Error from './Error'

export default function ContentLibrary({ title, description, load, route, register = false }) {
  const [query, setQuery] = useState('')
  const { data, loading, error, refetch } = useApi(load, [])
  const items = (Array.isArray(data) ? data : []).filter(item => [item.title, item.description, item.category, item.author].some(value => String(value || '').toLowerCase().includes(query.toLowerCase())))
  return <div><section className="section-padding bg-slate-950 text-white"><div className="container-custom"><h1 className="text-4xl font-bold">{title}</h1><p className="mt-4 text-slate-300">{description}</p></div></section><section className="section-padding"><div className="container-custom">
    <label className="mb-8 block max-w-lg text-sm font-medium"><span className="mb-2 flex items-center gap-2"><Search size={17} />Search {title.toLowerCase()}</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} className="w-full rounded-xl border p-3" /></label>
    {loading ? <Loading /> : error ? <><Error message={error} /><button onClick={refetch} className="mt-4 inline-flex gap-2 btn-primary"><RefreshCw size={18} />Retry</button></> : items.length === 0 ? <p className="rounded-xl border bg-white p-8 text-slate-600">{query ? 'No results match your search.' : 'Nothing has been published here yet. Please check back soon.'}</p> : <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{items.map(item => <article key={item.id} className="card"><img src={item.image || '/assets/img/bible.jpeg'} alt={item.title || ''} className="h-48 w-full object-cover" loading="lazy" /><p className="mt-4 text-xs text-amber-700">{item.category || title}</p><h2 className="mt-2 text-xl font-semibold">{item.title}</h2><p className="mt-3 text-sm text-slate-600">{item.excerpt || item.description}</p>{item.date && <p className="mt-3 text-sm text-slate-500">{Number.isFinite(+new Date(item.date)) ? new Date(item.date).toLocaleDateString() : 'Date to be confirmed'} {item.time || ''}</p>}{item.location && <p className="text-sm text-slate-500">{item.location}</p>}<Link className="mt-5 inline-flex items-center gap-2 font-semibold text-blue-700" to={`${route}/${register ? 'register/' : ''}${item.id}`}>{register ? 'Register for event' : 'Read more'}<ArrowRight size={16} /></Link></article>)}</div>}
  </div></section></div>
}
