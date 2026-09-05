import { useState } from 'react'
import { Heart, CreditCard, Loader2, ShieldCheck, Building2 } from 'lucide-react'
import { donationService } from '../services/api'
import { DONATION_TYPES, DONATION_CURRENCIES } from '../utils/constants'
import Error from '../components/Error'

const Donate = () => {
  const [formData, setFormData] = useState({ amount: '', currency: 'NGN', donationType: 'general', name: '', email: '', phone: '', message: '' })
  const [card, setCard] = useState({ number: '', expiryMonth: '', expiryYear: '', cvv: '' })
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const selectedCurrency = DONATION_CURRENCIES.find((c) => c.code === formData.currency) || DONATION_CURRENCIES[0]
  const quickAmounts = [50, 100, 250, 500, 1000, 5000, 10000]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    const rawAmount = Number.parseFloat(formData.amount)
    const cardNumber = String(card.number || '').replace(/\s/g, '')
    const expiryMonth = String(card.expiryMonth || '').trim()
    const expiryYear = String(card.expiryYear || '').trim()
    const cvv = String(card.cvv || '').trim()

    try {
      // Use JavaScript validation instead of browser-native form validation so
      // every failure is visible in the page and the request flow is debuggable.
      if (!Number.isFinite(rawAmount) || rawAmount <= 0) throw new Error('Please enter a valid donation amount.')
      if (formData.currency !== 'NGN') throw new Error('For the first Live V4 test, please use NGN.')
      if (!String(formData.name || '').trim()) throw new Error('Please enter your full name.')
      if (!/^\S+@\S+\.\S+$/.test(String(formData.email || '').trim())) throw new Error('Please enter a valid email address.')
      if (paymentMethod !== 'card') throw new Error('Bank transfer will be enabled after the card V4 flow is verified.')
      if (!/^\d{12,19}$/.test(cardNumber)) throw new Error('Please enter a valid 12-19 digit card number.')
      if (!/^\d{2}$/.test(expiryMonth) || !/^\d{4}$/.test(expiryYear)) throw new Error('Please enter the card expiry as MM and YYYY.')
      if (!/^\d{3,4}$/.test(cvv)) throw new Error('Please enter a valid 3 or 4 digit CVV.')

      setLoading(true)
      console.info('[CRH Payment] Starting donation request')

      const amount = selectedCurrency.decimals === 0 ? Math.round(rawAmount) : Math.round(rawAmount * 100) / 100
      const donationResponse = await donationService.create({
        ...formData,
        name: String(formData.name).trim(),
        email: String(formData.email).trim(),
        phone: String(formData.phone || '').trim(),
        amount,
      })
      const txRef = donationResponse?.data?.tx_ref
      if (!txRef) throw new Error('The donation reference could not be created.')
      console.info('[CRH Payment] Donation created', { tx_ref: txRef })

      // Raw card fields are sent only over HTTPS to our Render backend.
      // The backend encrypts them with FLW_ENCRYPTION_KEY and never logs or persists them.
      const paymentMethodPayload = {
        type: 'card',
        card: {
          number: cardNumber,
          expiry_month: expiryMonth,
          expiry_year: expiryYear,
          cvv,
        },
      }

      console.info('[CRH Payment] Initializing Flutterwave charge', { tx_ref: txRef })
      const paymentResponse = await donationService.initialize(txRef, paymentMethodPayload)
      const payment = paymentResponse?.data || {}
      console.info('[CRH Payment] Flutterwave initialization response', {
        tx_ref: txRef,
        status: payment.status || null,
        charge_id: payment.charge_id || null,
        next_action: payment.next_action?.type || null,
      })

      if (payment?.next_action?.type === 'redirect_url' && payment.next_action.redirect_url?.url) {
        window.location.assign(payment.next_action.redirect_url.url)
        return
      }
      if (payment?.redirect_url) {
        window.location.assign(payment.redirect_url)
        return
      }
      if (payment?.status === 'succeeded') {
        window.location.assign(`/donate/return?tx_ref=${encodeURIComponent(txRef)}`)
        return
      }

      if (payment?.next_action?.type) {
        throw new Error(`Flutterwave requires additional authorization (${payment.next_action.type}). The current checkout does not yet support this authorization step.`)
      }

      throw new Error('Flutterwave did not return a payment authorization or redirect URL.')
    } catch (err) {
      const status = err.response?.status
      const providerStatus = err.response?.data?.provider_status
      const providerCode = err.response?.data?.provider_code
      const serverError = err.response?.data?.error

      console.error('[CRH Payment] Payment flow failed', {
        http_status: status || null,
        provider_status: providerStatus || null,
        provider_code: providerCode || null,
        message: err.message || null,
      })

      if (serverError) {
        const diagnostic = [
          serverError,
          providerStatus ? `Provider HTTP ${providerStatus}` : null,
          providerCode ? `Provider code ${providerCode}` : null,
        ].filter(Boolean).join(' — ')
        setError(diagnostic)
      } else if (err.message) {
        setError(err.message)
      } else {
        setError('Payment setup failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => setFormData((current) => ({ ...current, [e.target.name]: e.target.value }))
  const handleCardChange = (e) => setCard((current) => ({ ...current, [e.target.name]: e.target.value }))

  return (
    <div>
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white section-padding">
        <div className="container-custom text-center">
          <Heart className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-5xl font-bold mb-4">Give Online</h1>
          <p className="text-xl max-w-3xl mx-auto">Your generous giving helps us spread the Gospel and serve our community. Thank you for your support!</p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="card">
                  <h2 className="text-2xl font-bold mb-6">Donation Information</h2>
                  {error && <Error message={error} />}
                  <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off" noValidate>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Currency *</label>
                      <select name="currency" required value={formData.currency} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                        {DONATION_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.label} ({c.code})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Donation Amount * ({selectedCurrency.code})</label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {quickAmounts.map((amount) => <button key={amount} type="button" onClick={() => setFormData((current) => ({ ...current, amount: amount.toString() }))} className={`px-4 py-2 rounded-lg border-2 ${formData.amount === amount.toString() ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-300 hover:border-blue-300'}`}>{selectedCurrency.symbol}{amount.toLocaleString()}</button>)}
                      </div>
                      <input type="number" name="amount" required min="1" step={selectedCurrency.decimals === 0 ? '1' : '0.01'} value={formData.amount} onChange={handleChange} placeholder="e.g. 100" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Donation Type *</label>
                      <select name="donationType" required value={formData.donationType} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                        {DONATION_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="Full Name *" autoComplete="name" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                      <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="Email Address *" autoComplete="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone Number" autoComplete="tel" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                    <textarea name="message" rows="3" value={formData.message} onChange={handleChange} placeholder="Message (Optional)" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => setPaymentMethod('card')} className={`p-3 rounded-lg border-2 flex items-center justify-center ${paymentMethod === 'card' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300'}`}><CreditCard className="w-5 h-5 mr-2" /> Card</button>
                        <button type="button" onClick={() => setPaymentMethod('bank_transfer')} className={`p-3 rounded-lg border-2 flex items-center justify-center ${paymentMethod === 'bank_transfer' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300'}`}><Building2 className="w-5 h-5 mr-2" /> Bank Transfer</button>
                      </div>
                    </div>
                    {paymentMethod === 'card' && <div className="space-y-4 rounded-lg border border-gray-200 p-4 bg-gray-50">
                      <h3 className="font-semibold">Card Details</h3>
                      <input type="text" name="number" inputMode="numeric" maxLength="23" required value={card.number} onChange={handleCardChange} placeholder="Card number" autoComplete="cc-number" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                      <div className="grid grid-cols-3 gap-3">
                        <input type="text" name="expiryMonth" inputMode="numeric" maxLength="2" required value={card.expiryMonth} onChange={handleCardChange} placeholder="MM" autoComplete="cc-exp-month" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        <input type="text" name="expiryYear" inputMode="numeric" maxLength="4" required value={card.expiryYear} onChange={handleCardChange} placeholder="YYYY" autoComplete="cc-exp-year" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        <input type="password" name="cvv" inputMode="numeric" maxLength="4" required value={card.cvv} onChange={handleCardChange} placeholder="CVV" autoComplete="cc-csc" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                      </div>
                      <p className="text-xs text-gray-600">Card details are transmitted only over HTTPS to the secure payment backend. They are encrypted there with Flutterwave's encryption key and are never stored in the CRH database.</p>
                    </div>}
                    {paymentMethod === 'bank_transfer' && <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">Bank-transfer checkout will be enabled after we verify the first card V4 flow.</div>}
                    <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex gap-3">
                      <ShieldCheck className="w-6 h-6 text-green-600 flex-shrink-0" />
                      <p className="text-sm text-green-800">Payment credentials and encryption keys remain on the secure backend. Card details are not stored in the CRH database.</p>
                    </div>
                    <button type="submit" disabled={loading || paymentMethod !== 'card'} className="btn-primary w-full flex items-center justify-center disabled:opacity-60">
                      {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Preparing Secure Payment...</> : <><CreditCard className="w-5 h-5 mr-2" /> Proceed to Secure Payment</>}
                    </button>
                  </form>
                </div>
              </div>
              <div>
                <div className="card bg-blue-50 border-2 border-blue-200"><h3 className="text-xl font-semibold mb-4">Why Give?</h3><ul className="space-y-3 text-gray-700"><li>❤️ Support our mission to spread the Gospel</li><li>❤️ Help us serve our community</li><li>❤️ Enable our ministries to grow</li><li>❤️ Make a lasting impact</li></ul></div>
                <div className="card mt-6"><h3 className="text-lg font-semibold mb-2">Other Ways to Give</h3><p className="text-sm text-gray-600">You can also give through bank transfer, check, or in person at our church office.</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Donate
