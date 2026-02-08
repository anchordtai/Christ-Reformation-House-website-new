import { useState } from 'react'
import { Heart, CreditCard } from 'lucide-react'
import { donationService } from '../services/api'
import { DONATION_TYPES, DONATION_CURRENCIES } from '../utils/constants'
import Error from '../components/Error'

const Donate = () => {
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'NGN',
    donationType: 'general',
    name: '',
    email: '',
    phone: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const selectedCurrency = DONATION_CURRENCIES.find((c) => c.code === formData.currency) || DONATION_CURRENCIES[0]
  const quickAmounts = [50, 100, 250, 500, 1000, 5000, 10000]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const rawAmount = parseFloat(formData.amount)
      if (!rawAmount || rawAmount <= 0) {
        setError('Please enter a valid amount.')
        setLoading(false)
        return
      }
      const decimals = selectedCurrency.decimals
      const amount = decimals === 0 ? Math.round(rawAmount) : Math.round(rawAmount * 100) / 100
      const payload = { ...formData, amount }
      const res = await donationService.create(payload)
      // Backend returns { success: true, redirectUrl: "https://..." } – Flutterwave checkout link
      const redirectUrl = res?.data?.redirectUrl || res?.data?.data?.redirectUrl
      if (redirectUrl && typeof redirectUrl === 'string') {
        window.location.assign(redirectUrl)
        return
      }
      setError('Could not start payment. Please try again.')
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white section-padding">
        <div className="container-custom text-center">
          <Heart className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-5xl font-bold mb-4">Give Online</h1>
          <p className="text-xl max-w-3xl mx-auto">
            Your generous giving helps us spread the Gospel and serve our community. Thank you for your support!
          </p>
        </div>
      </section>

      {/* Donation Form */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form */}
              <div className="lg:col-span-2">
                <div className="card">
                  <h2 className="text-2xl font-bold mb-6">Donation Information</h2>
                  {error && <Error message={error} />}
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Currency */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Currency *
                      </label>
                      <select
                        name="currency"
                        required
                        value={formData.currency}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {DONATION_CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.symbol} {c.label} ({c.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Donation Amount * ({selectedCurrency.code})
                      </label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {quickAmounts.map((amount) => (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => setFormData({ ...formData, amount: amount.toString() })}
                            className={`px-4 py-2 rounded-lg border-2 transition-all ${
                              formData.amount === amount.toString()
                                ? 'border-blue-600 bg-blue-50 text-blue-600'
                                : 'border-gray-300 hover:border-blue-300'
                            }`}
                          >
                            {selectedCurrency.symbol}{amount.toLocaleString()}
                          </button>
                        ))}
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                          {selectedCurrency.symbol}
                        </span>
                        <input
                          type="number"
                          name="amount"
                          required
                          min="0.01"
                          step={selectedCurrency.decimals === 0 ? '1' : '0.01'}
                          value={formData.amount}
                          onChange={handleChange}
                          placeholder={
                            selectedCurrency.decimals === 0 ? 'e.g. 5000' : 'e.g. 25.50'
                          }
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Amount will be charged in {selectedCurrency.label}. No conversion applied.
                      </p>
                    </div>

                    {/* Donation Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Donation Type *
                      </label>
                      <select
                        name="donationType"
                        required
                        value={formData.donationType}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {DONATION_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-sm text-gray-500 mt-1">
                        {DONATION_TYPES.find(t => t.value === formData.donationType)?.description}
                      </p>
                    </div>

                    {/* Personal Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Message (Optional)
                      </label>
                      <textarea
                        name="message"
                        rows="3"
                        value={formData.message}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Any message or special instructions..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary w-full flex items-center justify-center"
                    >
                      {loading ? (
                        'Processing...'
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5 mr-2" />
                          Proceed to Payment
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Info Sidebar */}
              <div>
                <div className="card bg-blue-50 border-2 border-blue-200">
                  <h3 className="text-xl font-semibold mb-4">Why Give?</h3>
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start">
                      <Heart className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Support our mission to spread the Gospel</span>
                    </li>
                    <li className="flex items-start">
                      <Heart className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Help us serve our community</span>
                    </li>
                    <li className="flex items-start">
                      <Heart className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Enable our ministries to grow</span>
                    </li>
                    <li className="flex items-start">
                      <Heart className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Make a lasting impact</span>
                    </li>
                  </ul>
                </div>

                <div className="card mt-6">
                  <h3 className="text-lg font-semibold mb-2">Other Ways to Give</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    You can also give through bank transfer, check, or in person at our church office.
                  </p>
                  <p className="text-sm text-gray-600">
                    For more information, please contact us.
                  </p>
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
