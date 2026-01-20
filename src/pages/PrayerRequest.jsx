import { useState } from 'react'
import { Heart, Send } from 'lucide-react'
import { useFormSubmit } from '../hooks/useApi'
import { prayerService } from '../services/api'
import { PRAYER_REQUEST_TYPES } from '../utils/constants'
import Error from '../components/Error'

const PrayerRequest = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    requestType: 'personal',
    request: '',
    isAnonymous: false,
  })
  const { submit, loading, error, success } = useFormSubmit((data) => prayerService.create(data))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const submitData = formData.isAnonymous 
      ? { requestType: formData.requestType, request: formData.request, isAnonymous: true }
      : formData
    await submit(submitData)
    if (success) {
      setFormData({
        name: '',
        email: '',
        phone: '',
        requestType: 'personal',
        request: '',
        isAnonymous: false,
      })
    }
  }

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setFormData({
      ...formData,
      [e.target.name]: value,
    })
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 section-padding">
        <div className="max-w-md w-full card text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Prayer Request Received</h2>
          <p className="text-gray-600 mb-6">
            Thank you for sharing your prayer request. Our prayer team will be lifting you up in prayer.
            God hears and answers prayers!
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Submit Another Request
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white section-padding">
        <div className="container-custom text-center">
          <Heart className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-5xl font-bold mb-4">Prayer Request</h1>
          <p className="text-xl max-w-3xl mx-auto">
            We believe in the power of prayer. Share your prayer request with us, and our prayer team will intercede on your behalf.
          </p>
        </div>
      </section>

      {/* Prayer Request Form */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <div className="card mb-8 bg-blue-50 border-l-4 border-blue-600">
              <p className="text-gray-700">
                <strong>James 5:16</strong> - "Therefore confess your sins to each other and pray for each other so that you may be healed. The prayer of a righteous person is powerful and effective."
              </p>
            </div>

            <div className="card">
              <h2 className="text-2xl font-bold mb-6">Submit Your Prayer Request</h2>
              {error && <Error message={error} />}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Your Name {!formData.isAnonymous && '*'}
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required={!formData.isAnonymous}
                      disabled={formData.isAnonymous}
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address {!formData.isAnonymous && '*'}
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required={!formData.isAnonymous}
                      disabled={formData.isAnonymous}
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="requestType" className="block text-sm font-medium text-gray-700 mb-2">
                    Request Type *
                  </label>
                  <select
                    id="requestType"
                    name="requestType"
                    required
                    value={formData.requestType}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {PRAYER_REQUEST_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="request" className="block text-sm font-medium text-gray-700 mb-2">
                    Prayer Request *
                  </label>
                  <textarea
                    id="request"
                    name="request"
                    rows="6"
                    required
                    value={formData.request}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Please share your prayer request here..."
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Your request will be shared with our prayer team. All information is kept confidential.
                  </p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isAnonymous"
                    name="isAnonymous"
                    checked={formData.isAnonymous}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isAnonymous" className="ml-2 text-sm text-gray-700">
                    Submit anonymously (name and email not required)
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center"
                >
                  {loading ? (
                    'Submitting...'
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Submit Prayer Request
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="card mt-8 bg-purple-50">
              <h3 className="text-lg font-semibold mb-2">Prayer Team</h3>
              <p className="text-gray-700 text-sm">
                Our dedicated prayer team meets regularly to intercede for all prayer requests. 
                We believe that God hears and answers prayers, and we're committed to standing 
                with you in faith.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default PrayerRequest
