import { useState, useRef } from 'react'
import { Mail, Phone, MapPin, Send, MessageCircle } from 'lucide-react'
import { sendContact, commerceError } from '../services/ministry-commerce'
import { APP_CONFIG } from '../utils/constants'
import Error from '../components/Error'

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  })
  const [loading,setLoading]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(false),[reference,setReference]=useState(''),[consent,setConsent]=useState(false),[website,setWebsite]=useState('')
  const submission=useRef(crypto.randomUUID()),busy=useRef(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if(busy.current)return
    busy.current=true;setLoading(true);setError('')
    try{const result=await sendContact({...formData,submissionId:submission.current,consent,website});setReference(result.reference||'');setSuccess(true);setFormData({name:'',email:'',phone:'',subject:'',message:''})}catch(e){setError(commerceError(e))}finally{busy.current=false;setLoading(false)}
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 section-padding">
        <div className="max-w-md w-full card text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Message received</h2>
          <p className="text-gray-600 mb-6">
            Your message has been saved for the ministry team to review. No automatic email confirmation is sent.
          </p>
          {reference&&<p className="text-xs break-all mb-4">Your reference: {reference}</p>}
          <button
            onClick={() => {setSuccess(false);setReference('');setConsent(false);submission.current=crypto.randomUUID()}}
            className="btn-primary"
          >
            Send Another Message
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <section className="bg-slate-950 text-white px-5 py-12 md:py-16">
        <div className="container-custom grid items-center gap-10 lg:grid-cols-2">
          <div><p className="text-xs font-semibold uppercase tracking-widest text-amber-300 mb-5">You are welcome here</p><h1 className="text-4xl md:text-5xl font-bold mb-5">Let’s connect.</h1><p className="text-slate-300 text-lg leading-relaxed">Have a question, planning a visit, or looking for a place to grow in faith? Connect with Christ’s Reformation House International.</p></div>
          <figure><img src="/assets/portraits/anchord-black.webp" alt="Apostle (Dr) Anchord Taiwo in a black suit" width="1200" height="800" className="w-full rounded-2xl" decoding="async" /><figcaption className="mt-2 text-xs text-slate-400">Apostle (Dr) Anchord Taiwo</figcaption></figure>
        </div>
      </section>

      {/* Contact Section */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Info */}
            <div className="space-y-6">
              <div className="card">
                <div className="flex items-start">
                  <MapPin className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Address</h3>
                    <p className="text-gray-600">{APP_CONFIG.CHURCH_ADDRESS}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-start">
                  <Phone className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Phone</h3>
                    <p className="text-gray-600">{APP_CONFIG.CHURCH_PHONE}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-start">
                  <Mail className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Email</h3>
                    <p className="text-gray-600">
                      <a href={`mailto:${APP_CONFIG.CHURCH_EMAIL}`} className="hover:text-blue-600">
                        {APP_CONFIG.CHURCH_EMAIL}
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-start">
                  <MessageCircle className="w-6 h-6 text-green-600 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">WhatsApp</h3>
                    <p className="text-gray-600">
                      <a href={APP_CONFIG.CHURCH_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-green-600">
                        {APP_CONFIG.CHURCH_WHATSAPP}
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              <div className="card bg-blue-50">
                <h3 className="font-semibold mb-2">Office Hours</h3>
                <p className="text-sm text-gray-600">
                  Please call or message the ministry to confirm a suitable visiting time.
                </p>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="card">
                <h2 className="text-2xl font-bold mb-6">Send us a Message</h2>
                {error && <div role="alert"><Error message={error} /></div>}
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div style={{position:'absolute',left:'-10000px'}} aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)}/></label></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        maxLength={100}
                        autoComplete="name"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        maxLength={254}
                        autoComplete="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      maxLength={40}
                      autoComplete="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                      Subject *
                    </label>
                    <input
                      type="text"
                      maxLength={160}
                      id="subject"
                      name="subject"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                      Message *
                    </label>
                    <textarea
                      maxLength={5000}
                      id="message"
                      name="message"
                      rows="6"
                      required
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your message here..."
                    />
                  </div>

                  <label className="flex items-start gap-3 text-sm"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>I agree that the ministry may store these contact details and this message to respond to my enquiry. Please do not include payment details or passwords.</span></label>
                  <button
                    type="submit"
                    disabled={loading||!consent}
                    className="btn-primary w-full flex items-center justify-center"
                  >
                    {loading ? (
                      'Sending...'
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Contact


