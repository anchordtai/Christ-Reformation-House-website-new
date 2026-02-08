// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  TIMEOUT: 10000,
}

// Payment: gateway keys must NEVER be in frontend. All Flutterwave/Stripe/Paystack
// operations use the backend; only API base URL is needed here.
export const PAYMENT_CONFIG = {
  CURRENCY: 'USD',
}

// Live stream (Facebook Page ID / video ID from env)
export const LIVE_STREAM_CONFIG = {
  FACEBOOK_PAGE_ID: import.meta.env.VITE_FACEBOOK_PAGE_ID || '',
  FACEBOOK_VIDEO_ID: import.meta.env.VITE_FACEBOOK_VIDEO_ID || '',
  FACEBOOK_APP_ID: import.meta.env.VITE_FACEBOOK_APP_ID || '',
}

// App Configuration
export const APP_CONFIG = {
  CHURCH_NAME: "Christ's Reformation House International",
  CHURCH_EMAIL: 'info@christreformationhouse.org.ng',
  CHURCH_PHONE: '+2348138463804, +2347032878124',
  CHURCH_WHATSAPP: '+2348138463804',
  CHURCH_WHATSAPP_LINK: 'https://wa.me/2348138463804',
  CHURCH_INSTAGRAM: 'https://www.instagram.com/apostletaiwoanchord?igsh=OW44ejJiZmx6ejN6',
  CHURCH_FACEBOOK: 'https://web.facebook.com/profile.php?id=100069245150281',
  CHURCH_TIKTOK: 'https://vm.tiktok.com/ZS91VQHsE8kaF-6cfm4/',
  CHURCH_YOUTUBE: '', // Add YouTube channel URL when available
  CHURCH_ADDRESS: "Christ's Reformation House Giri, FCT Abuja, Nigeria.",
}

// Donation currencies (Flutterwave-supported). Amount is in this currency; no conversion.
export const DONATION_CURRENCIES = [
  { code: 'NGN', label: 'Nigerian Naira', symbol: '₦', decimals: 0 },
  { code: 'USD', label: 'US Dollar', symbol: '$', decimals: 2 },
  { code: 'GBP', label: 'British Pound', symbol: '£', decimals: 2 },
  { code: 'EUR', label: 'Euro', symbol: '€', decimals: 2 },
  { code: 'GHS', label: 'Ghanaian Cedi', symbol: 'GH₵', decimals: 2 },
  { code: 'ZAR', label: 'South African Rand', symbol: 'R', decimals: 2 },
  { code: 'KES', label: 'Kenyan Shilling', symbol: 'KSh', decimals: 2 },
]

// Donation Types
export const DONATION_TYPES = [
  { value: 'general', label: 'General Donation', description: 'Support our general ministry and operations' },
  { value: 'missions', label: 'Missions', description: 'Help us spread the Gospel around the world' },
  { value: 'building', label: 'Building Fund', description: 'Contribute to our building and facilities' },
  { value: 'youth', label: 'Youth Ministry', description: 'Support our youth programs and activities' },
  { value: 'outreach', label: 'Community Outreach', description: 'Help us serve our local community' },
]

// Jitsi / Meeting (use env in production)
export const MEETING_CONFIG = {
  JITSI_DOMAIN: import.meta.env.VITE_JITSI_DOMAIN || 'meet.jit.si',
  APP_NAME: "Christ's Reformation House",
  DEFAULT_AVATAR: '/assets/img/crhlogo.jpg',
}

// Prayer Request Types
export const PRAYER_REQUEST_TYPES = [
  { value: 'personal', label: 'Personal' },
  { value: 'family', label: 'Family' },
  { value: 'health', label: 'Health' },
  { value: 'financial', label: 'Financial' },
  { value: 'spiritual', label: 'Spiritual Growth' },
  { value: 'other', label: 'Other' },
]




