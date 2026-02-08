import { useState } from 'react'
import { Heart, Loader2 } from 'lucide-react'
import { paymentService } from '../../services/api'
import { PAYMENT_CONFIG, DONATION_TYPES } from '../../utils/constants'
import { sanitizeHtml } from '../../utils/security'
import Error from '../Error'

const GATEWAYS = [
  { id: 'stripe', label: 'Stripe', key: 'STRIPE_PUBLIC_KEY' },
  { id: 'paystack', label: 'Paystack', key: 'PAYSTACK_PUBLIC_KEY' },
  { id: 'flutterwave', label: 'Flutterwave', key: 'FLUTTERWAVE_PUBLIC_KEY' },
].filter((g) => PAYMENT_CONFIG[g.key])

/**
 * Donation form that creates payment intent via backend and redirects to gateway.
 * Backend must implement POST /payments/create with { amount, currency, gateway, donor info }.
 */
export default function PaymentGatewayForm({ onSuccess }) {
  const [gateway, setGateway] = useState(GATEWAYS[0]?.id || 'stripe')
  const [amount, setAmount] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [donationType, setDonationType] = useState('general')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const quickAmounts = [10, 25, 50, 100, 250, 500]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount.')
      return
    }
    setLoading(true)
    try {
      const res = await paymentService.createIntent({
        amount: numAmount,
        currency: PAYMENT_CONFIG.CURRENCY,
        gateway,
        donationType,
        name: sanitizeHtml(name),
        email: sanitizeHtml(email),
      })
      const data = res?.data
      if (data?.redirectUrl) {
        window.location.href = data.redirectUrl
        return
      }
      if (data?.clientSecret && gateway === 'stripe') {
        // Optional: use Stripe.js to confirm card here
        setError('Stripe client secret received. Integrate Stripe.js for card form.')
      }
      onSuccess?.(data)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Payment could not be started.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <Error message={error} />}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Amount *</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {quickAmounts.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAmount(String(a))}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                amount === String(a)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              ${a}
            </button>
          ))}
        </div>
        <input
          type="number"
          min="1"
          step="0.01"
          placeholder="Other amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Designation</label>
        <select
          value={donationType}
          onChange={(e) => setDonationType(e.target.value)}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
        >
          {DONATION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {GATEWAYS.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Payment method</label>
          <div className="flex gap-3">
            {GATEWAYS.map((g) => (
              <label key={g.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gateway"
                  value={g.id}
                  checked={gateway === g.id}
                  onChange={() => setGateway(g.id)}
                  className="text-indigo-600"
                />
                <span className="text-sm">{g.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Name *</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-semibold rounded-xl transition-colors"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Heart className="w-5 h-5" />}
        {loading ? 'Processing...' : 'Give securely'}
      </button>
    </form>
  )
}
