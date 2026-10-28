const crypto = require('node:crypto');

function enabledCurrencies() {
  const supported = new Set(['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'ZAR', 'KES']);
  return [...new Set(String(process.env.DONATION_CURRENCIES || 'NGN').split(',').map(s => s.trim().toUpperCase()).filter(s => supported.has(s)))];
}

function authorizationType(action) {
  if (action?.type === 'authorize') return ['pin', 'otp', 'avs'].includes(action.authorization?.type) ? action.authorization.type : undefined;
  return { requires_pin: 'pin', requires_otp: 'otp', requires_additional_fields: 'avs' }[action?.type];
}

function paymentResponse(donation, charge) {
  return { success: true, tx_ref: donation.tx_ref, charge_id: String(charge.id), status: charge.status || 'pending', next_action: charge.next_action || null };
}

function matchesDonation(donation, charge) {
  return String(charge?.reference || '') === donation.tx_ref && Number(charge?.amount) === Number(donation.amount) && String(charge?.currency || '').toUpperCase() === donation.currency;
}

function initializationKey(txRef) {
  return crypto.createHash('sha256').update(`crh-initialize:${txRef}`).digest('hex');
}

module.exports = { enabledCurrencies, authorizationType, paymentResponse, matchesDonation, initializationKey };
