/**
 * Input sanitization to prevent XSS.
 * For production, consider using DOMPurify: npm install dompurify
 */

const SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi
const ON_EVENT_REGEX = /\s*on\w+\s*=\s*["'][^"']*["']/gi
const JAVASCRIPT_REGEX = /javascript:/gi

/**
 * Sanitize a string for safe display in HTML (strips scripts and event handlers).
 * @param {string} input
 * @returns {string}
 */
export function sanitizeHtml(input) {
  if (input == null || typeof input !== 'string') return ''
  return input
    .replace(SCRIPT_REGEX, '')
    .replace(ON_EVENT_REGEX, '')
    .replace(JAVASCRIPT_REGEX, '')
    .trim()
}

/**
 * Sanitize for use in attributes (escape quotes).
 * @param {string} input
 * @returns {string}
 */
export function sanitizeAttr(input) {
  if (input == null || typeof input !== 'string') return ''
  return input
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Get CSRF token from meta tag (set by backend).
 * @returns {string|null}
 */
export function getCsrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]')
  return meta ? meta.getAttribute('content') : null
}
