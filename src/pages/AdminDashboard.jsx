import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { adminService } from '../services/api'
import Error from '../components/Error'
import Loading from '../components/Loading'
const initial = { title: '', description: '', content: '', date: new Date().toLocaleDateString('en-CA'), category: '', author: '', image: '', videoUrl: '', scripture: '', scriptureText: '', prayer: '', location: '', time: '', price: '', currency: 'NGN' }
export default function AdminDashboard() {
  const [kind, setKind] = useState('sermon')
  const [form, setForm] = useState(initial)
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [inbox, setInbox] = useState('messages')
  const content = useApi(() => adminService.getContent(kind), [kind])
  const submissions = useApi(() => adminService.getInbox(inbox), [inbox])
  const fields = ['title', 'description', 'date', 'category', 'author', 'image', ...(kind === 'sermon' ? ['videoUrl', 'content'] : kind === 'event' ? ['location', 'time'] : kind === 'devotional' ? ['scripture', 'scriptureText', 'content', 'prayer'] : kind === 'product' ? ['price', 'currency'] : ['content'])]
  async function save(e) {
    e.preventDefault(); if (busy) return; setBusy(true); setMessage('')
    try { await adminService.saveContent(kind, { ...form, name: form.title, excerpt: form.description, transcript: form.content }, editing); setMessage('Content saved.'); setForm(initial); setEditing(null); content.refetch() }
    catch (error) { setMessage(error.response?.data?.error || 'Content could not be saved.') }
    finally { setBusy(false) }
  }
  async function remove(id) {
    if (!window.confirm('Remove this published item?')) return
    try { await adminService.deleteContent(kind, id); content.refetch() } catch (error) { setMessage(error.response?.data?.error || 'Item could not be removed.') }
  }
  return <div className="section-padding"><div className="container-custom"><h1 className="text-3xl font-bold">Ministry workspace</h1><div className="my-6 flex flex-wrap gap-4"><Link className="btn-primary" to="/meetings/schedule">Schedule a meeting</Link><Link className="btn-secondary" to="/meetings">View meetings</Link></div>
    <div className="grid gap-8 lg:grid-cols-2"><section className="card"><h2 className="text-xl font-semibold mb-4">Publish ministry content</h2><label className="block mb-5">Content type<select className="mt-2 block w-full rounded border p-3" value={kind} onChange={e => { setKind(e.target.value); setEditing(null); setForm(initial) }}>{['sermon','event','blog','devotional','product'].map(value => <option key={value}>{value}</option>)}</select></label>
    <form onSubmit={save} className="space-y-4">{fields.map(field => <label className="block text-sm" key={field}>{({ videoUrl: 'Video embed URL (HTTPS)', image: 'Image URL or site asset path', scriptureText: 'Scripture text', currency: 'Currency code' })[field] || field[0].toUpperCase() + field.slice(1)}{['content','description','prayer','scriptureText'].includes(field) ? <textarea className="mt-2 w-full rounded border p-3" rows={4} value={form[field] || ''} onChange={e => { const value = e.target.value; setForm(current => ({ ...current, [field]: value })) }} /> : <input className="mt-2 w-full rounded border p-3" type={field === 'date' ? 'date' : field === 'price' ? 'number' : 'text'} step={field === 'price' ? '0.01' : undefined} required={field === 'title'} value={form[field] || ''} onChange={e => { const value = e.target.value; setForm(current => ({ ...current, [field]: value })) }} />}</label>)}<button disabled={busy} className="btn-primary">{busy ? 'Saving…' : editing ? 'Save changes' : 'Publish content'}</button>{editing && <button type="button" className="ml-4" onClick={() => { setEditing(null); setForm(initial) }}>Cancel edit</button>}</form>{message && <p role="status" className="mt-4">{message}</p>}
    {content.loading ? <Loading /> : content.error ? <Error message={content.error} /> : <ul className="mt-6 space-y-3">{(content.data || []).map(item => <li className="flex gap-3 items-center border-t pt-3" key={item.id}><span className="flex-1">{item.title}</span><button onClick={() => { setEditing(item.id); setForm({ ...initial, ...item }) }} className="text-blue-700">Edit</button><button onClick={() => remove(item.id)} className="text-red-700">Remove</button></li>)}</ul>}</section>
    <section className="card"><h2 className="text-xl font-semibold mb-4">Ministry inbox</h2><label>View<select className="ml-3 rounded border p-3" value={inbox} onChange={e => setInbox(e.target.value)}>{['messages','prayers','registrations','orders'].map(value => <option key={value}>{value}</option>)}</select></label>{submissions.loading ? <Loading /> : submissions.error ? <Error message={submissions.error} /> : !submissions.data?.length ? <p className="mt-6 text-slate-500">No submissions yet.</p> : <div className="mt-5 space-y-4">{submissions.data.map(item => <article key={item.id} className="rounded border p-4"><p className="font-semibold">{item.name || (item.isAnonymous ? 'Anonymous' : item.email || item.id)}</p>{item.email && <a href={`mailto:${item.email}`} className="text-sm text-blue-700">{item.email}</a>}<p className="mt-3 whitespace-pre-wrap">{item.message || item.request || item.specialRequests || item.status}</p>{item.items && <ul>{item.items.map(product => <li key={product.id}>{product.name} × {product.quantity}</li>)}</ul>}<p className="mt-3 text-xs text-slate-500">Reference: {item.id}</p></article>)}</div>}</section></div>
  </div></div>
}
