export function authorizationType(action) {
  if (action?.type === 'authorize') return ['pin', 'otp', 'avs'].includes(action.authorization?.type) ? action.authorization.type : undefined;
  return { requires_pin: 'pin', requires_otp: 'otp', requires_additional_fields: 'avs' }[action?.type];
}

export function paymentState(data) {
  if (data?.verified === true) return 'success';
  const status = String(data?.charge_status || data?.status || '').toLowerCase();
  if (['failed', 'cancelled', 'canceled'].includes(status)) return status === 'failed' ? 'failed' : 'cancelled';
  if (['pending', 'processing', 'new'].includes(status)) return 'pending';
  return 'unconfirmed';
}

export function redirectUrl(payment) {
  // Top-level redirect_url is the merchant return URL, not bank authorization.
  const value = payment?.next_action?.type === 'redirect_url' ? payment.next_action.redirect_url?.url : null;
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('The bank authorization link is invalid. Check payment status before paying again.');
  return url.href;
}

export function validateCard(card, now = new Date()) {
  const number = String(card.number || '').replace(/\s/g, '');
  const month = Number(card.expiryMonth);
  const year = Number(card.expiryYear);
  if (!/^\d{12,19}$/.test(number)) throw new Error('Enter a valid card number.');
  if (!/^\d{2}$/.test(card.expiryMonth) || month < 1 || month > 12 || !/^\d{4}$/.test(card.expiryYear)) throw new Error('Enter a valid expiry month and four-digit year.');
  if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) throw new Error('This card has expired.');
  if (!/^\d{3,4}$/.test(card.cvv)) throw new Error('Enter a valid card security code.');
  return { type: 'card', card: { number, expiry_month: card.expiryMonth, expiry_year: card.expiryYear, cvv: card.cvv } };
}
