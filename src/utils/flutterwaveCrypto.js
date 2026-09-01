const encoder = new TextEncoder()

function bytesToBase64(bytes) {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

function base64ToBytes(value) {
  const binary = atob(value)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function randomNonce(length = 12) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('')
}

/**
 * Flutterwave V4 AES-GCM encryption for card fields.
 * The encryption key is intentionally used in the browser because Flutterwave's
 * V4 card flow requires the card data to be encrypted before the payment-method
 * request. Raw card data is never sent to the CRH backend.
 */
export async function encryptFlutterwaveCardField(value, encryptionKey, nonce) {
  if (!value || !encryptionKey) throw new Error('Flutterwave card encryption is not configured.')
  if (!nonce || nonce.length !== 12) throw new Error('Flutterwave encryption nonce must be exactly 12 characters.')

  const keyBytes = base64ToBytes(encryptionKey)
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt'])
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: encoder.encode(nonce) },
    key,
    encoder.encode(String(value))
  )

  return bytesToBase64(new Uint8Array(encrypted))
}

export async function buildFlutterwaveCardPaymentMethod({ cardNumber, expiryMonth, expiryYear, cvv }) {
  const encryptionKey = import.meta.env.VITE_FLW_ENCRYPTION_KEY
  if (!encryptionKey) throw new Error('Flutterwave encryption key is not configured on the website.')

  const nonce = randomNonce(12)
  const [encryptedCardNumber, encryptedExpiryMonth, encryptedExpiryYear, encryptedCvv] = await Promise.all([
    encryptFlutterwaveCardField(cardNumber.replace(/\s/g, ''), encryptionKey, nonce),
    encryptFlutterwaveCardField(String(expiryMonth).padStart(2, '0'), encryptionKey, nonce),
    encryptFlutterwaveCardField(String(expiryYear), encryptionKey, nonce),
    encryptFlutterwaveCardField(cvv, encryptionKey, nonce),
  ])

  return {
    type: 'card',
    card: {
      nonce,
      encrypted_card_number: encryptedCardNumber,
      encrypted_expiry_month: encryptedExpiryMonth,
      encrypted_expiry_year: encryptedExpiryYear,
      encrypted_cvv: encryptedCvv,
    },
  }
}
