import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Heart, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { donationService } from '../services/api'

/**
 * Flutterwave redirects here after payment. We verify the transaction server-side
 * and show success or failure. No payment keys or sensitive data in frontend.
 */
export default function DonateReturn() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('loading') // 'loading' | 'success' | 'failed'
  const [message, setMessage] = useState('')

  const transactionId = searchParams.get('transaction_id')
  const txRef = searchParams.get('tx_ref')
  const flwStatus = searchParams.get('status')

  useEffect(() => {
    if (!transactionId && flwStatus !== 'successful') {
      setStatus('failed')
      setMessage('Payment was not completed or the link is invalid.')
      return
    }

    const verify = async () => {
      try {
        const res = await donationService.verify(transactionId, txRef)
        if (res?.data?.verified) {
          setStatus('success')
        } else {
          setStatus('failed')
          setMessage(res?.data?.error || 'Verification did not succeed.')
        }
      } catch (err) {
        setStatus('failed')
        setMessage(err.response?.data?.error || err.message || 'We could not verify your payment.')
      }
    }

    if (transactionId) {
      verify()
    } else {
      setStatus(flwStatus === 'successful' ? 'failed' : 'failed')
      setMessage(flwStatus === 'successful' ? 'Verification could not be completed. Please contact us with your transaction reference.' : 'Payment was not completed.')
    }
  }, [transactionId, txRef, flwStatus])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 section-padding">
      <div className="max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifying your donation</h1>
            <p className="text-gray-600">Please wait...</p>
          </>
        )}

        {status === 'success' && (
          <div className="card">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank you!</h1>
            <p className="text-gray-600 mb-6">
              Your donation was received successfully. We are grateful for your generous support.
            </p>
            <Link to="/" className="btn-primary inline-block">
              Back to Home
            </Link>
            <Link to="/donate" className="block mt-3 text-indigo-600 font-medium hover:underline">
              Make another donation
            </Link>
          </div>
        )}

        {status === 'failed' && (
          <div className="card">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment issue</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link to="/donate" className="btn-primary inline-block">
              Try again
            </Link>
            <Link to="/contact" className="block mt-3 text-indigo-600 font-medium hover:underline">
              Contact us for help
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
