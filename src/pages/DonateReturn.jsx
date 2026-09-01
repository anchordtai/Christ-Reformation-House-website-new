import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { donationService } from '../services/api'

export default function DonateReturn() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('Verifying your payment securely with the server...')
  const txRef = searchParams.get('tx_ref')

  useEffect(() => {
    if (!txRef) {
      setStatus('failed')
      setMessage('The payment reference is missing. Please contact the church if you were charged.')
      return
    }

    let cancelled = false
    const verify = async () => {
      try {
        const response = await donationService.verify(txRef)
        if (cancelled) return
        if (response.data?.verified) {
          setStatus('success')
          setMessage('Your donation has been verified successfully.')
        } else {
          setStatus('failed')
          setMessage(response.data?.error || `Payment status: ${response.data?.status || 'pending'}. If you were charged, please keep your transaction reference and contact us.`)
        }
      } catch (err) {
        if (cancelled) return
        setStatus('failed')
        setMessage(err.response?.data?.error || 'We could not verify the payment right now. If you were charged, please contact us with your transaction reference.')
      }
    }

    verify()
    return () => { cancelled = true }
  }, [txRef])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 section-padding">
      <div className="max-w-md w-full text-center">
        {status === 'loading' && <><Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-4" /><h1 className="text-2xl font-bold mb-2">Verifying your donation</h1><p className="text-gray-600">{message}</p></>}
        {status === 'success' && <div className="card"><CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" /><h1 className="text-2xl font-bold mb-2">Thank you!</h1><p className="text-gray-600 mb-6">{message}</p><Link to="/" className="btn-primary inline-block">Back to Home</Link></div>}
        {status === 'failed' && <div className="card"><XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" /><h1 className="text-2xl font-bold mb-2">Payment status</h1><p className="text-gray-600 mb-6">{message}</p><p className="text-xs text-gray-500 mb-6 break-all">Reference: {txRef || 'not available'}</p><Link to="/donate" className="btn-primary inline-block">Return to Donation</Link></div>}
      </div>
    </div>
  )
}
