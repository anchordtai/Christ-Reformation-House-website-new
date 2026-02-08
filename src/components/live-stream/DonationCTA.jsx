import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, CreditCard } from 'lucide-react'

/**
 * Call-to-action for donations on the live stream page.
 * Links to main donate page with optional gateway; can be extended to open a modal.
 */
export default function DonationCTA({ compact = false }) {
  const [hover, setHover] = useState(false)

  if (compact) {
    return (
      <Link
        to="/donate"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
      >
        <Heart className="w-5 h-5" />
        Give Now
      </Link>
    )
  }

  return (
    <div
      className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl p-6 text-white shadow-xl"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <Heart className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg">Support the ministry</h3>
          <p className="text-rose-100 text-sm mt-1">
            Your gift helps us reach more people with the Gospel. Give securely online.
          </p>
          <Link
            to="/donate"
            className={`mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-white text-rose-600 font-semibold rounded-xl transition-all ${
              hover ? 'shadow-lg scale-[1.02]' : ''
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Give Now
          </Link>
        </div>
      </div>
    </div>
  )
}
