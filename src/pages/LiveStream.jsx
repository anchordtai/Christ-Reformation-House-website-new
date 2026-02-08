import { useState } from 'react'
import MetaTags from '../components/MetaTags'
import VideoPlayer from '../components/live-stream/VideoPlayer'
import LiveComments from '../components/live-stream/LiveComments'
import DonationCTA from '../components/live-stream/DonationCTA'
import { LIVE_STREAM_CONFIG } from '../utils/constants'

export default function LiveStream() {
  const [isLive] = useState(true)
  const videoId = LIVE_STREAM_CONFIG.FACEBOOK_VIDEO_ID || LIVE_STREAM_CONFIG.FACEBOOK_PAGE_ID

  return (
    <div className="min-h-screen bg-slate-50">
      <MetaTags
        title="Live"
        description="Watch our church services live. Join us online for worship and the Word."
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white py-8 sm:py-10">
        <div className="container-custom">
          <div className="flex items-center gap-3 mb-2">
            <span className="relative flex h-3 w-3">
              <span
                className={`absolute inline-flex h-3 w-3 rounded-full opacity-75 ${
                  isLive ? 'animate-ping bg-red-400' : 'bg-slate-500'
                }`}
              />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isLive ? 'bg-red-500' : 'bg-slate-500'}`} />
            </span>
            <span className="text-sm font-medium text-slate-300">
              {isLive ? 'Live now' : 'Offline — check back for next service'}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold">Live Service</h1>
          <p className="text-slate-300 mt-1">Watch with us and join the conversation below.</p>
        </div>
      </section>

      {/* Main layout: video + sidebar */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-2 space-y-6">
              <VideoPlayer videoId={videoId} />
              <DonationCTA />
            </div>
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-24">
                <LiveComments videoId={videoId} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
