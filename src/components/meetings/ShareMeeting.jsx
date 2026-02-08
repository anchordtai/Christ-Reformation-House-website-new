import { useState } from 'react'
import { Share2, Copy, Mail, Check, Facebook, Twitter, MessageCircle } from 'lucide-react'
import { APP_CONFIG } from '../../utils/constants'

function buildMeetingUrl(meeting) {
  const base = window.location.origin
  const path = `/meetings/room/${meeting.id}`
  const token = meeting.joinToken ? `?token=${meeting.joinToken}` : ''
  return `${base}${path}${token}`
}

function shareLinks(meeting) {
  const url = encodeURIComponent(buildMeetingUrl(meeting))
  const text = encodeURIComponent(meeting.title || 'Meeting')
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    twitter: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
    whatsapp: `https://wa.me/?text=${text}%20${url}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
  }
}

export default function ShareMeeting({ meeting, className = '' }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const url = buildMeetingUrl(meeting)
  const links = shareLinks(meeting)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const openPopup = (href) => {
    window.open(href, 'share', 'width=600,height=400')
    setOpen(false)
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors"
      >
        <Share2 className="w-4 h-4" />
        Share
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-white rounded-xl border border-slate-200 shadow-xl py-2">
            <button
              type="button"
              onClick={handleCopy}
              className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            <a
              href={`mailto:?subject=${encodeURIComponent(meeting.title || 'Meeting invitation')}&body=${encodeURIComponent(`You're invited to: ${meeting.title}\n\nJoin here: ${url}`)}`}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Mail className="w-4 h-4" />
              Email
            </a>
            <div className="border-t border-slate-100 my-2" />
            <div className="px-3 py-1 text-xs text-slate-500">Share on</div>
            <div className="flex gap-1 px-2">
              <button
                type="button"
                onClick={() => openPopup(links.facebook)}
                className="p-2 rounded-lg hover:bg-slate-100 text-[#1877F2]"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => openPopup(links.twitter)}
                className="p-2 rounded-lg hover:bg-slate-100 text-[#1DA1F2]"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => openPopup(links.whatsapp)}
                className="p-2 rounded-lg hover:bg-slate-100 text-[#25D366]"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => openPopup(links.linkedin)}
                className="p-2 rounded-lg hover:bg-slate-100 text-[#0A66C2]"
                aria-label="LinkedIn"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
