import { useState } from 'react'
import { Heart, CreditCard, Loader2, ShieldCheck } from 'lucide-react'
import { donationService } from '../services/api'
import { DONATION_TYPES, DONATION_CURRENCIES } from '../utils/constants'
import Error from '../components/Error'

const Donate = () => {
  const [formData, setFormData] = useState({ amount: '', currency: 'NGN', donationType: 'general', name: '', email: '', phone: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const selectedCurrency = DONATION_CURRENCIES.find((c) => c.code === formData.currency) || DONATION_CURRENCIES[0]
  const quickAmounts = [50, 100, 250, 500, 1000, 5000, 10000]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const rawAmount = Number.parseFloat(formData.amount)
      if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
        setError('Please enter a valid donation amount.')
        return
      }

      const decimals = selectedCurrency.decimals
      const amount = decimals === 0 ? Math.round(rawAmount) : Math.round(rawAmount * 100) / 100
      const donationResponse = await donationService.create({ ...formData, amount })
      const txRef = donationResponse?.data?.tx_ref
      if (!txRef) throw new Error('The donation reference could not be created.')

      // V4 payment-method details are intentionally not collected as raw card data here.
      // The backend requires a supported Flutterwave payment method object. Until a
      // Flutterwave-hosted/client payment method is selected, show a clear message rather
      // than sending sensitive card data through the CRH frontend.
      setError('Your donation reference has been created. Select a supported Flutterwave payment method to continue.')
      console.info('Donation created:', txRef)
    } catch (err) {
      const status = err.response?.status
      if (!err.response) {
        setError('Network error: the website could not reach the payment server. Please check your internet connection and try again.')
      } else {
        setError(err.response?.data?.error || `Payment setup failed${status ? ` (HTTP ${status})` : ''}. Please try again.`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => setFormData((current) => ({ ...current, [e.target.name]: e.target.value }))

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
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Currency *</label>
                      <select name="currency" required value={formData.currency} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                        {DONATION_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.label} ({c.code})</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Donation Amount * ({selectedCurrency.code})</label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {quickAmounts.map((amount) => (
                          <button key={amount} type="button" onClick={() => setFormData((current) => ({ ...current, amount: amount.toString() }))} className={`px-4 py-2 rounded-lg border-2 ${formData.amount === amount.toString() ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-300 hover:border-blue-300'}`}>
                            {selectedCurrency.symbol}{amount.toLocaleString()}
                          </button>
                        ))}
                      </div>
                      <input type="number" name="amount" required min="0.01" step={selectedCurrency.decimals === 0 ? '1' : '0.01'} value={formData.amount} onChange={handleChange} placeholder={selectedCurrency.decimals === 0 ? 'e.g. 5000' : 'e.g. 25.50'} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Donation Type *</label>
                      <select name="donationType" required value={formData.donationType} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                        {DONATION_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="Full Name *" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                      <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="Email Address *" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                    </div>

                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone Number" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                    <textarea name="message" rows="3" value={formData.message} onChange={handleChange} placeholder="Message (Optional)" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />

                    <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex gap-3">
                      <ShieldCheck className="w-6 h-6 text-green-600 flex-shrink-0" />
                      <p className="text-sm text-green-800">Payments are processed securely through our server-side Flutterwave V4 integration. Card secrets and payment credentials are never stored in this website.</p>
                    </div>

                    <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center">
                      {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Preparing...</> : <><CreditCard className="w-5 h-5 mr-2" /> Proceed to Payment</>}
                    </button>
                  </form>
                </div>
              </div>

              <div>
                <div className="card bg-blue-50 border-2 border-blue-200">
                  <h3 className="text-xl font-semibold mb-4">Why Give?</h3>
                  <ul className="space-y-3 text-gray-700">
                    <li>❤️ Support our mission to spread the Gospel</li>
                    <li>❤️ Help us serve our community</li>
                    <li>❤️ Enable our ministries to grow</li>
                    <li>❤️ Make a lasting impact</li>
                  </ul>
                </div>
                <div className="card mt-6">
                  <h3 className="text-lg font-semibold mb-2">Other Ways to Give</h3>
                  <p className="text-sm text-gray-600">You can also give through bank transfer, check, or in person at our church office.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Donate
