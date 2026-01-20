// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  TIMEOUT: 10000,
}

// Payment Gateway Configuration
export const PAYMENT_CONFIG = {
  GATEWAY_KEY: import.meta.env.VITE_PAYMENT_GATEWAY_KEY || '',
  CURRENCY: 'USD',
}

// App Configuration
export const APP_CONFIG = {
  CHURCH_NAME: "Christ's Reformation House International",
  CHURCH_EMAIL: 'info@reformationhouse.org',
  CHURCH_PHONE: '+1 (234) 567-8900',
  CHURCH_ADDRESS: '123 Church Street, City, State 12345, Country',
}

// Donation Types
export const DONATION_TYPES = [
  { value: 'general', label: 'General Donation', description: 'Support our general ministry and operations' },
  { value: 'missions', label: 'Missions', description: 'Help us spread the Gospel around the world' },
  { value: 'building', label: 'Building Fund', description: 'Contribute to our building and facilities' },
  { value: 'youth', label: 'Youth Ministry', description: 'Support our youth programs and activities' },
  { value: 'outreach', label: 'Community Outreach', description: 'Help us serve our local community' },
]

// Prayer Request Types
export const PRAYER_REQUEST_TYPES = [
  { value: 'personal', label: 'Personal' },
  { value: 'family', label: 'Family' },
  { value: 'health', label: 'Health' },
  { value: 'financial', label: 'Financial' },
  { value: 'spiritual', label: 'Spiritual Growth' },
  { value: 'other', label: 'Other' },
]




