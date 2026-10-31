import {ministryFaq} from './ministry-faq.mjs'
const responses = {
  welcome: { text: 'Welcome to Christ’s Reformation House. I’m an automated ministry guide. I can help you find prayer support, salvation resources, preaching, online meetings and giving. For a person, open staff chat or WhatsApp.', links: [{ label: 'Speak with the ministry', href: 'https://wa.me/2348138463804', external: true }] },
  salvation: { text: 'The good news is that salvation is God’s gift through Jesus Christ. Read our visitor guide, and contact the ministry if you would like someone to pray with you.', links: [{ label: 'A new beginning in Christ', href: '/salvation' }] },
  prayer: { text: 'You can ask the ministry for prayer, encouragement and pastoral support. You do not need to face fear or difficulty alone. Choose the prayer-support page or speak with the ministry on WhatsApp.', links: [{ label: 'Prayer & pastoral support', href: '/prayer-support' }, { label: 'Speak with the ministry', href: 'https://wa.me/2348138463804', external: true }] },
  meetings: { text: 'Open the meeting center to create an invitation or paste a link from your host. Calls use the website’s embedded Jitsi connection for audio, video, chat and screen sharing. The authorised host signs in, starts the meeting and may admit guests from the waiting room.', links: [{ label: 'Open meeting center', href: '/meetings' }] },
  giving: { text: 'Open Give to choose your currency and available payment method. NGN offers bank transfer, USSD, OPay and cards when enabled. A gift is confirmed only after payment verification. If you have a debit or unresolved payment, keep your reference and check it before giving again. Never share card details, PINs or OTPs in chat.', links: [{ label: 'Open secure giving', href: '/donate' }] },
  location: { text: 'The ministry is at Christ’s Reformation House, Giri, FCT Abuja, Nigeria. Please contact the ministry for the current Sunday service time and directions.', links: [{ label: 'Contact the ministry', href: '/contact' }, { label: 'Ask on WhatsApp', href: 'https://wa.me/2348138463804', external: true }] },
  preaching: { text: 'Open Watch for the ministry’s announced YouTube broadcast and the KJV Bible reader. If no broadcast is announced, you can still read the Bible.', links: [{ label: 'Watch & grow', href: '/watch' }] },
  testimony: { text: 'We would love to hear your story. Prepare a testimony for the ministry to review. Nothing is published automatically, and you choose whether to grant permission to publish.', links: [{ label: 'Share your testimony', href: '/testimonies' }] },
}
export function guideReply(input = '') {
  const text = String(input).toLowerCase().slice(0, 500)
  const topic=/devotional|supernatural/.test(text)?'devotional':/store|shopping|collection|book/.test(text)?'store':/faq|frequently/.test(text)?'chat':null
  if(topic){const item=ministryFaq.find(i=>i.id===topic);return {key:topic,text:item.answer,links:item.links}}
  let key = 'welcome'
  if (/donat|giv(e|ing)|payment|transfer|ussd|opay|pin|otp|debit/.test(text)) key = 'giving'
  else if (/salvation|saved|jesus|born again|gospel/.test(text)) key = 'salvation'
  else if (/pray|deliver|attack|fear|satan|support|counsel|help/.test(text)) key = 'prayer'
  else if (/meet|video|audio|camera|screen|join|host/.test(text)) key = 'meetings'
  else if (/where|locat|address|time|sunday|service|direction/.test(text)) key = 'location'
  else if (/testimon|story/.test(text)) key = 'testimony'
  else if (/watch|preach|faith|sermon|facebook/.test(text)) key = 'preaching'
  return { ...responses[key], key }
}

