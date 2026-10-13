import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react'
import { donationService } from '../services/api'

const MAX_RETRIES = 6
const RETRY_DELAY_MS = 4000

export default function DonateReturn() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('Verifying your payment securely with the server...')
  const [retryCount, setRetryCount] = useState(0)
  const txRef = searchParams.get('tx_ref')

  useEffect(() => {
    if (!txRef) {
      setStatus('failed')
      setMessage('The payment reference is missing. Please contact the church if you were charged.')
      return
    }

    let cancelled = false
    let retryTimer

    const verify = async (attempt = 0) => {
      try {
        const response = await donationService.verify(txRef)
        if (cancelled) return

        if (response.data?.verified) {
          setStatus('success')
          setMessage(response.data?.warning || 'Your donation has been verified successfully. Thank you for your generosity!')
          return
        }

        const chargeStatus = String(response.data?.charge_status || response.data?.status || '').toLowerCase()
        const isPending = chargeStatus === 'pending' || chargeStatus === 'processing'
        const serverMessage = response.data?.error

        if (isPending && attempt < MAX_RETRIES) {
          setRetryCount(attempt + 1)
          setMessage(`Payment is still processing. Checking again (${attempt + 1}/${MAX_RETRIES})...`)
          retryTimer = window.setTimeout(() => verify(attempt + 1), RETRY_DELAY_MS)
          return
        }

        setStatus('failed')
        setMessage(
          serverMessage ||
            `Payment status: ${response.data?.status || chargeStatus || 'unknown'}. If you were charged, please keep your transaction reference and contact us.`
        )
      } catch (err) {
        if (cancelled) return

        const httpStatus = err.response?.status
        const serverMessage = err.response?.data?.error
        const isRetryable = httpStatus === 502 || httpStatus === 503 || httpStatus === 409

        if (isRetryable && attempt < MAX_RETRIES) {
          setRetryCount(attempt + 1)
          setMessage(`Verification is taking longer than expected. Retrying (${attempt + 1}/${MAX_RETRIES})...`)
          retryTimer = window.setTimeout(() => verify(attempt + 1), RETRY_DELAY_MS)
          return
        }

        setStatus('failed')
        setMessage(
          serverMessage ||
            'We could not verify the payment right now. If you were charged, please contact us with your transaction reference.'
        )
      }
    }

    verify()

    return () => {
      cancelled = true
      if (retryTimer) window.clearTimeout(retryTimer)
    }
  }, [txRef])

  const handleManualRetry = () => {
    setStatus('loading')
    setMessage('Verifying your payment securely with the server...')
    setRetryCount(0)
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 section-padding">
      <div className="max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Verifying your donation</h1>
            <p className="text-gray-600">{message}</p>
            {retryCount > 0 && <p className="text-sm text-gray-500 mt-3">Attempt {retryCount} of {MAX_RETRIES}</p>}
          </>
        )}

        {status === 'success' && (
          <div className="card">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Thank you!</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link to="/" className="btn-primary inline-block">Back to Home</Link>
          </div>
        )}

        {status === 'failed' && (
          <div className="card">
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Payment status</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <p className="text-xs text-gray-500 mb-6 break-all">Reference: {txRef || 'not available'}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button type="button" onClick={handleManualRetry} className="btn-secondary inline-flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Check again
              </button>
              <Link to="/donate" className="btn-primary inline-block">Return to Donation</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
