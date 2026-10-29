import { APP_CONFIG } from '../utils/constants'

export const preachingTopics = [
  { id: 'faith', title: 'Build your faith.', eyebrow: 'Faith for everyday life', text: 'Explore the ministry’s preaching and take your next step in trusting God.', scripture: 'Romans 10:17', image: '/assets/portraits/ministering-pink.webp', action: 'Browse preaching on Facebook' },
  { id: 'salvation', title: 'A new beginning in Christ.', eyebrow: 'The good news', text: 'Discover the message of salvation and connect with someone who can pray with you.', scripture: 'John 3:16', image: '/assets/portraits/anchord-navy.webp', action: 'Explore salvation', href: '/salvation' },
  { id: 'prayer', title: 'Find hope. Receive prayer.', eyebrow: 'Prayer & freedom', text: 'Find encouragement in Christ and ask the ministry for pastoral prayer and support.', scripture: '2 Timothy 1:7', image: '/assets/portraits/ministering-orange.webp', action: 'Request pastoral support', href: '/prayer-support' },
]

// Add only owner-approved stories with permission to publish the chosen identity.
// Until approved stories are supplied, the website shows an invitation to share.
export const approvedTestimonies = []

export const ministryFacebook = APP_CONFIG.CHURCH_FACEBOOK
export function whatsappDraft(text) {
  return `${APP_CONFIG.CHURCH_WHATSAPP_LINK}?text=${encodeURIComponent(text)}`
}
