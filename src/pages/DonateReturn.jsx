import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2, RefreshCw, Clock, HelpCircle } from 'lucide-react'
import { donationService } from '../services/api'
import { APP_CONFIG } from '../utils/constants'
import { paymentState } from '../utils/donation.mjs'

const MAX_RETRIES = 6
const RETRY_DELAY_MS = 4000
const descriptions = {
  success: { title: 'Thank you for your generosity', text: 'Your donation has been verified. Thank you for partnering with the ministry.', Icon: CheckCircle, color: 'text-emerald-700' },
  pending: { title: 'Your payment is still processing', text: 'We have not received final confirmation. Please check again before making another payment.', Icon: Clock, color: 'text-amber-700' },
  failed: { title: 'Payment was not completed', text: 'The payment provider reported this payment as failed. If you see a debit, contact the ministry with your reference before trying again.', Icon: XCircle, color: 'text-red-700' },
  cancelled: { title: 'Payment cancelled', text: 'The payment provider reported this payment as cancelled. If you see a debit, contact the ministry before trying again.', Icon: XCircle, color: 'text-slate-600' },
  unconfirmed: { title: 'We could not confirm your payment', text: 'This does not mean your payment failed. Save your reference and check again or contact the ministry. Please do not pay again until the status is resolved.', Icon: HelpCircle, color: 'text-amber-700' },
}
export default function DonateReturn() {
  const [params] = useSearchParams()
  const txRef = params.get('tx_ref') || ''
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('Checking your payment with the server…')
  const [attempt, setAttempt] = useState(0)
  const [retry, setRetry] = useState(0)
  const [failure, setFailure] = useState(null)
  useEffect(() => {
    let cancelled = false
    let timer
    setAttempt(0)
    setFailure(null)
    if (!/^crh-[a-z0-9-]{6,38}$/i.test(txRef)) {
      setStatus('unconfirmed'); setMessage('A valid payment reference is missing. Contact the ministry if you were charged.'); return
    }
    setStatus('loading'); setMessage('Checking your payment with the server…')
    async function verify(n = 0) {
      try {
        const { data } = await donationService.verify(txRef)
        if (cancelled) return
        const next = paymentState(data)
        if (next === 'pending' && n < MAX_RETRIES) {
          setAttempt(n + 1); setMessage('Your payment is processing. Checking for confirmation…')
          timer = setTimeout(() => verify(n + 1), RETRY_DELAY_MS); return
        }
        setStatus(next); setMessage(data.warning || descriptions[next].text)
        setFailure(next === 'failed' ? data.failure || null : null)
        if (next === 'success') clearThisCheckout()
      } catch (err) {
        if (cancelled) return
        const retryable = !err.response || [409, 429, 500, 502, 503, 504].includes(err.response.status)
        if (retryable && n < MAX_RETRIES) {
          setAttempt(n + 1); setMessage('Confirmation is taking longer than expected. Checking again…')
          timer = setTimeout(() => verify(n + 1), RETRY_DELAY_MS); return
        }
        setStatus('unconfirmed')
        setMessage(err.response?.status === 404 ? 'We could not find this donation reference. Contact the ministry if you were charged.' : descriptions.unconfirmed.text)
      }
    }
    function clearThisCheckout() {
      try {
        const saved = JSON.parse(sessionStorage.getItem('crh-donation-checkout') || 'null')
        if (`crh-${saved?.checkout_id}` === txRef) sessionStorage.removeItem('crh-donation-checkout')
      } catch { /* Storage is optional. */ }
    }
    verify()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [txRef, retry])
  const state = descriptions[status]
  function clearResolvedCheckout() {
    try {
      const saved = JSON.parse(sessionStorage.getItem('crh-donation-checkout') || 'null')
      if (`crh-${saved?.checkout_id}` === txRef) sessionStorage.removeItem('crh-donation-checkout')
    } catch { /* Storage is optional. */ }
  }
  return <section className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-16">
    <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-10" aria-live="polite" aria-atomic="true">
      {status === 'loading' ? <><Loader2 className="mx-auto mb-6 h-14 w-14 animate-spin text-slate-700" /><h1 className="mb-4 text-3xl font-bold">Verifying your gift</h1><p className="text-slate-600">{message}</p>{attempt > 0 && <p className="mt-3 text-sm text-slate-500">Recheck {attempt} of {MAX_RETRIES}</p>}</> : <><state.Icon className={`mx-auto mb-6 h-14 w-14 ${state.color}`} /><h1 className="mb-4 text-3xl font-bold text-slate-900">{state.title}</h1><p className="leading-relaxed text-slate-600">{message}</p></>}
      {failure && <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4 text-left text-sm text-red-900"><p>{failure.message}</p>{failure.support_code && <p className="mt-2 font-mono text-xs">Provider support code: {failure.support_code}</p>}</div>}
      {txRef && <div className="my-6 rounded-xl bg-slate-50 p-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Payment reference</p><p className="break-all font-mono text-xs text-slate-700">{txRef}</p></div>}
      {status !== 'loading' && <div className="mt-6 space-y-4">
        {status !== 'success' && <button onClick={() => setRetry(n => n + 1)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white"><RefreshCw className="h-4 w-4" />Check again</button>}
        {['pending', 'unconfirmed'].includes(status) && <Link className="block font-medium text-blue-700 underline" to="/donate">Resume existing checkout</Link>}
        {['failed', 'cancelled'].includes(status) && <Link onClick={clearResolvedCheckout} className="block font-medium text-blue-700 underline" to="/donate">Return to giving</Link>}
        {status !== 'success' && <a href={`mailto:${APP_CONFIG.CHURCH_EMAIL}?subject=${encodeURIComponent('Donation assistance: ' + txRef)}`} className="block text-sm text-blue-700 underline">Contact the ministry for help</a>}
        <Link to="/" className="block text-sm text-slate-600 underline">Back to home</Link>
      </div>}
    </div>
  </section>
}
