import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, CreditCard, Loader2, ShieldCheck, Globe2, BookOpen, Users } from 'lucide-react'
import { donationService } from '../services/api'
import { APP_CONFIG, DONATION_TYPES, DONATION_CURRENCIES } from '../utils/constants'
import { authorizationType, redirectUrl, validateCard } from '../utils/donation.mjs'

const STORAGE_KEY = 'crh-donation-checkout'
const emptyCard = { number: '', expiryMonth: '', expiryYear: '', cvv: '' }
const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500'
function Field({ label, id, ...props }) {
  return <label htmlFor={id} className="block text-sm font-medium text-slate-700"><span className="mb-2 block">{label}</span><input id={id} className={inputClass} {...props} /></label>
}
function readCheckout() {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null')
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value?.checkout_id || '') ? value : null
  } catch { return null }
}
export default function Donate() {
  const [form, setForm] = useState({ amount: '', currency: 'NGN', donationType: 'general', name: '', email: '', phone: '', message: '' })
  const [card, setCard] = useState(emptyCard)
  const [checkout, setCheckout] = useState(readCheckout)
  const [config, setConfig] = useState(null)
  const [configError, setConfigError] = useState('')
  const [configAttempt, setConfigAttempt] = useState(0)
  const [action, setAction] = useState(null)
  const [code, setCode] = useState('')
  const [address, setAddress] = useState({ line1: '', city: '', state: '', postal_code: '', country: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const busy = useRef(false)
  const errorRef = useRef(null)
  useEffect(() => {
    let cancelled = false
    setConfigError('')
    donationService.getConfig().then(({ data }) => {
      const currencies = DONATION_CURRENCIES.filter(c => data.currencies?.includes(c.code))
      if (!currencies.length || !data.payment_methods?.includes('card') || !data.card_encryption_enabled) throw new Error('Giving unavailable')
      if (cancelled) return
      setConfig({ ...data, currencies })
      setForm(current => ({ ...current, currency: currencies.some(c => c.code === current.currency) ? current.currency : currencies[0].code }))
    }).catch(() => { if (!cancelled) setConfigError('We could not load online giving. Please retry or contact the church for assistance.') })
    return () => { cancelled = true }
  }, [configAttempt])
  useEffect(() => { if (error) errorRef.current?.focus() }, [error])
  const txRef = checkout ? `crh-${checkout.checkout_id}` : ''
  const returnPath = `/donate/return?tx_ref=${encodeURIComponent(txRef)}`
  const currency = DONATION_CURRENCIES.find(c => c.code === form.currency)
  const authType = authorizationType(action)
  const change = e => { const { name, value } = e.target; setForm(current => ({ ...current, [name]: value, ...(name === 'currency' ? { amount: '' } : {}) })) }
  const changeCard = (key, value) => setCard(current => ({ ...current, [key]: value }))
  const changeAddress = (key, value) => setAddress(current => ({ ...current, [key]: key === 'country' ? value.toUpperCase() : value }))
  function saveCheckout(value) {
    setCheckout(value)
    // Only an opaque ID is persisted. No card, PIN, OTP, or donor details.
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value)) } catch { /* Storage is optional. */ }
  }
  function handlePayment(payment, reference) {
    setCard(emptyCard)
    setCode('')
    const url = redirectUrl(payment)
    if (url) { window.location.assign(url); return }
    if (authorizationType(payment.next_action)) { setAction(payment.next_action); return }
    if (payment.next_action?.type && !['payment_instruction', 'payment_instructions'].includes(payment.next_action.type)) throw new Error('This payment requires assistance from the ministry. Keep your reference and check its status before paying again.');
    window.location.assign(`/donate/return?tx_ref=${encodeURIComponent(reference)}`)
  }
  async function run(operation) {
    if (busy.current) return
    busy.current = true; setLoading(true); setError('')
    try { await operation() }
    catch (err) {
      setError(err.response?.data?.error || err.message || 'Checkout could not be confirmed. Check payment status before paying again.')
      setCode('')
      if (err.response?.status === 404) {
        // No donation record exists, so no charge can be initialized for it.
        setCheckout(null)
        try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* Storage is optional. */ }
      }
    } finally { busy.current = false; setLoading(false) }
  }
  function submit(e) {
    e.preventDefault()
    run(async () => {
      const method = validateCard(card)
      const amount = Number(form.amount)
      if (!checkout && (!Number.isFinite(amount) || amount < 0.01 || amount > 100000000)) throw new Error('Enter an amount between 0.01 and 100,000,000.')
      const attempt = checkout || { checkout_id: crypto.randomUUID() }
      if (!checkout) saveCheckout(attempt)
      const reference = `crh-${attempt.checkout_id}`
      if (!checkout) await donationService.create({ ...form, name: form.name.trim(), email: form.email.trim(), amount: Math.round(amount * 100) / 100, checkout_id: attempt.checkout_id })
      const response = await donationService.initialize(reference, method)
      handlePayment(response.data, reference)
    })
  }
  function resume() {
    run(async () => { const { data } = await donationService.initialize(txRef); handlePayment(data, txRef) })
  }
  function authorize(e) {
    e.preventDefault()
    run(async () => {
      const authorization = authType === 'avs' ? { type: 'avs', address } : { type: authType, code }
      const { data } = await donationService.authorize(txRef, authorization)
      handlePayment(data, txRef)
    })
  }
  return <div className="bg-slate-50 text-slate-900">
    <section className="relative overflow-hidden bg-slate-950 px-5 py-16 text-white md:py-24">
      <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" aria-hidden="true" />
      <div className="container-custom relative grid items-center gap-8 lg:grid-cols-2">
        <div><p className="mb-4 text-sm font-semibold uppercase tracking-widest text-amber-300">Generosity with purpose</p><h1 className="mb-6 text-4xl font-bold leading-tight md:text-6xl">Your giving.<br /><span className="text-amber-300">A shared mission.</span></h1><p className="max-w-xl text-lg leading-relaxed text-slate-300">Help Christ’s Reformation House share the Gospel, nurture faith, and serve people in Abuja and beyond.</p></div>
        <div className="rounded-3xl border border-white/15 bg-white/5 p-8"><Heart className="mb-5 h-8 w-8 text-amber-300" /><p className="text-xl leading-relaxed">“God loves a cheerful giver.”</p><p className="mt-3 text-sm text-slate-400">2 Corinthians 9:7</p><p className="mt-6 text-sm leading-relaxed text-slate-300">Give freely, as you purpose in your heart. Every gift is an opportunity to participate in the work of ministry.</p></div>
      </div>
    </section>
    <section className="container-custom grid gap-10 px-5 py-12 lg:grid-cols-3 md:py-16">
      <aside className="space-y-7">
        <div><p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-700">Make an impact</p><h2 className="text-3xl font-bold">Partner in the work.</h2></div>
        {[{ icon: Globe2, title: 'Reach people', text: 'Support missions and the sharing of the Gospel.' }, { icon: BookOpen, title: 'Build faith', text: 'Help strengthen teaching, discipleship, and ministry.' }, { icon: Users, title: 'Serve communities', text: 'Participate in outreach and the care of others.' }].map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-4"><Icon className="h-6 w-6 shrink-0 text-amber-700" /><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p></div></div>)}
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-semibold">Need help with a gift?</h3><p className="mt-2 text-sm text-slate-600">If you were charged, keep your reference and check its status before making another payment.</p><a className="mt-4 inline-block break-all text-sm font-medium text-blue-700 underline" href={`mailto:${APP_CONFIG.CHURCH_EMAIL}`}>{APP_CONFIG.CHURCH_EMAIL}</a><Link to="/contact" className="mt-3 block text-sm text-blue-700 underline">Contact the ministry</Link></div>
      </aside>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 lg:col-span-2">
        <div className="mb-7 flex items-start justify-between gap-4"><div><h2 className="text-2xl font-bold">{checkout ? 'Continue your gift' : 'Give online'}</h2><p className="mt-2 text-sm text-slate-600">Global giving · Powered by Flutterwave</p></div><ShieldCheck className="h-7 w-7 shrink-0 text-emerald-700" /></div>
        {error && <div ref={errorRef} tabIndex={-1} role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
        {checkout && <div className="mb-6 space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"><p>Keep this reference to resume or check your payment. Please check before giving again.</p><p className="break-all font-mono text-xs">{txRef}</p><div className="flex flex-wrap gap-4"><Link className="font-semibold text-blue-800 underline" to={returnPath}>Check payment status</Link><button type="button" disabled={loading} onClick={resume} className="font-semibold text-blue-800 underline disabled:opacity-50">Resume bank authorization</button></div></div>}
        {configError ? <div role="alert"><p className="text-slate-700">{configError}</p><button className="mt-4 rounded-xl bg-slate-900 px-5 py-3 text-white" onClick={() => setConfigAttempt(n => n + 1)}>Retry connection</button></div> : !config ? <p role="status" className="flex gap-3 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" />Loading giving options…</p> : authType ? <form onSubmit={authorize} className="space-y-5">
          <h3 className="text-xl font-semibold">{authType === 'otp' ? 'Enter your bank’s one-time code' : authType === 'pin' ? 'Authorize with your card PIN' : 'Confirm your billing address'}</h3><p className="text-sm text-slate-600">Your bank requires this step to continue this payment. Authorization details are not saved.</p>
          <fieldset disabled={loading} className="space-y-4">{authType === 'avs' ? Object.keys(address).map(field => <Field key={field} id={`billing-${field}`} label={{ line1: 'Street address', city: 'City', state: 'State / region', postal_code: 'Postal code', country: 'Country code (e.g. NG)' }[field]} required maxLength={field === 'country' ? 2 : 150} value={address[field]} onChange={e => changeAddress(field, e.target.value)} />) : <Field id="bank-code" label={authType === 'otp' ? 'One-time code' : 'Card PIN'} type="password" autoComplete={authType === 'otp' ? 'one-time-code' : 'off'} inputMode="numeric" required pattern={authType === 'otp' ? '[0-9]{4,10}' : '[0-9]{4,6}'} maxLength={authType === 'otp' ? 10 : 6} value={code} onChange={e => setCode(e.target.value)} />}</fieldset>
          <button disabled={loading} className="btn-primary w-full">{loading ? 'Confirming…' : 'Continue authorization'}</button>
        </form> : <form onSubmit={submit} className="space-y-6">
          <fieldset disabled={loading || Boolean(checkout)} className="space-y-5 disabled:opacity-60"><legend className="mb-4 font-semibold">1. Your gift</legend>
            <label htmlFor="currency" className="block text-sm font-medium text-slate-700">Donation currency<select id="currency" name="currency" className={`${inputClass} mt-2`} value={form.currency} onChange={change}>{config.currencies.map(c => <option key={c.code} value={c.code}>{c.label} ({c.code})</option>)}</select></label>
            <p className="text-xs text-slate-500">Choose your giving currency. Card acceptance depends on your bank and the ministry’s payment account.</p>
            <div className="flex flex-wrap gap-2">{(form.currency === 'NGN' ? [1000, 5000, 10000, 25000] : [10, 25, 50, 100]).map(amount => <button key={amount} type="button" aria-pressed={form.amount === String(amount)} onClick={() => setForm(current => ({ ...current, amount: String(amount) }))} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${form.amount === String(amount) ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700'}`}>{currency?.symbol}{amount.toLocaleString()}</button>)}</div>
            <Field id="amount" label={`Amount (${form.currency})`} name="amount" type="number" inputMode="decimal" min="0.01" max="100000000" step="0.01" required value={form.amount} onChange={change} />
            <label htmlFor="donationType" className="block text-sm font-medium text-slate-700">Give towards<select id="donationType" name="donationType" className={`${inputClass} mt-2`} value={form.donationType} onChange={change}>{DONATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
            <div className="grid gap-4 sm:grid-cols-2"><Field id="name" label="Full name" name="name" autoComplete="name" required maxLength={120} value={form.name} onChange={change} /><Field id="email" label="Email address" name="email" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={change} /></div>
            <Field id="phone" label="Phone number (optional, Nigerian number)" name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={change} />
            <label htmlFor="message" className="block text-sm font-medium text-slate-700">Message (optional)<textarea id="message" name="message" rows={3} maxLength={1000} className={`${inputClass} mt-2`} value={form.message} onChange={change} /></label>
          </fieldset>
          <fieldset disabled={loading} className="space-y-4 border-t border-slate-200 pt-6"><legend className="font-semibold">2. Card payment</legend><p className="text-sm text-slate-600">{checkout ? 'If a charge already exists, use “Resume bank authorization” above. Only enter card details if checkout has not started.' : 'Your bank may ask you to authorize the payment in the next step.'}</p>
            <Field id="card-number" label="Card number" inputMode="numeric" autoComplete="cc-number" required maxLength={23} value={card.number} onChange={e => changeCard('number', e.target.value)} />
            <div className="grid grid-cols-3 gap-3">{[{ key: 'expiryMonth', label: 'Month (MM)', length: 2, auto: 'cc-exp-month' }, { key: 'expiryYear', label: 'Year (YYYY)', length: 4, auto: 'cc-exp-year' }, { key: 'cvv', label: 'CVV', length: 4, auto: 'cc-csc' }].map(f => <Field key={f.key} id={f.key} label={f.label} type={f.key === 'cvv' ? 'password' : 'text'} inputMode="numeric" autoComplete={f.auto} maxLength={f.length} required value={card[f.key]} onChange={e => changeCard(f.key, e.target.value)} />)}</div>
          </fieldset>
          <p className="rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">Card details are sent to our payment backend for encrypted submission to Flutterwave. They are not saved as part of your donation record. Your gift is charged in your selected currency. We do not convert the amount; your bank may apply its own exchange rate or fees.</p>
          <button disabled={loading} className="flex w-full items-center justify-center gap-3 rounded-xl bg-slate-950 px-6 py-4 font-semibold text-white hover:bg-slate-800 disabled:opacity-60">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}{loading ? 'Preparing your payment…' : `Continue to payment (${form.currency})`}</button>
        </form>}
        <p className="mt-5 text-center text-xs text-slate-500">Your gift is confirmed only after server verification.</p>
      </div>
    </section>
  </div>
}
