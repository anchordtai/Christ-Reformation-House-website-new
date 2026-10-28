export function authorizationType(action) {
  if (action?.type === 'authorize') return ['pin', 'otp', 'avs'].includes(action.authorization?.type) ? action.authorization.type : undefined;
  return { requires_pin: 'pin', requires_otp: 'otp', requires_additional_fields: 'avs' }[action?.type];
}

export const paymentLabels = { card: 'Debit or credit card', bank_transfer: 'Bank transfer', ussd: 'USSD', opay: 'OPay wallet' };
export function availableMethods(config, currency) {
  const methods = config?.methods_by_currency?.[currency] || config?.payment_methods || [];
  return methods.filter(type => paymentLabels[type] && (type === 'card' ? config.card_encryption_enabled : currency === 'NGN'));
}
export function paymentInstructions(payment) {
  const action = payment?.next_action;
  if (action?.type === 'bank_transfer') {
    const bank = action.bank_transfer;
    if (!/^\d{6,20}$/.test(String(bank?.account_number || '')) || !bank.bank_name || !Number.isFinite(Number(bank.amount)) || Number(bank.amount) <= 0 || !Number.isFinite(Date.parse(bank.expires_at))) throw new Error('Transfer details could not be confirmed. Keep your reference and contact the ministry.');
    return { ...bank, type: 'bank_transfer' };
  }
  if (['payment_instruction', 'payment_instructions'].includes(action?.type)) {
    const note = action[action.type]?.note;
    if (typeof note !== 'string' || !note.trim()) throw new Error('Payment instructions are unavailable. Keep your reference and contact the ministry.');
    return { type: 'note', note: note.slice(0, 1000) };
  }
  return null;
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
