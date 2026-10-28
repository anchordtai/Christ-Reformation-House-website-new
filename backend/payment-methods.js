const crypto = require('node:crypto');
const definitions = {
  card: { label: 'Debit or credit card', currencies: ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'ZAR', 'KES'] },
  bank_transfer: { label: 'Bank transfer', currencies: ['NGN'] },
  ussd: { label: 'USSD', currencies: ['NGN'] },
  opay: { label: 'OPay wallet', currencies: ['NGN'] },
};

function configuredMethods() {
  // Opt in after confirming merchant availability; an empty setting disables giving.
  return [...new Set(String(process.env.DONATION_PAYMENT_METHODS ?? 'card').split(',').map(s => s.trim()).filter(s => definitions[s]))];
}
function methodsFor(currency) {
  return configuredMethods().filter(method => definitions[method].currencies.includes(currency) && (method !== 'card' || Boolean(process.env.FLW_ENCRYPTION_KEY)));
}
function methodCatalog() {
  return Object.fromEntries(configuredMethods().map(type => [type, definitions[type]]));
}
function operationKey(reference, operation) {
  return crypto.createHash('sha256').update(`${reference}:${operation}`).digest('hex');
}
function customerId(charge) {
  return String(charge?.customer_id || (typeof charge?.customer === 'object' ? charge.customer?.id : charge?.customer) || '');
}
function normalizeTransfer(account, donation, expectedCustomer) {
  const expires = Date.parse(account?.account_expiration_datetime);
  const amount = Number(account?.amount);
  if (!String(account?.id || '').startsWith('van_') || account.account_type !== 'dynamic' || account.status !== 'active' || account.reference !== donation.tx_ref || customerId(account) !== expectedCustomer || account.currency !== donation.currency || !Number.isFinite(amount) || amount < Number(donation.amount) || !/^\d{6,20}$/.test(String(account.account_number || '')) || !account.account_bank_name || !Number.isFinite(expires)) {
    throw new Error('Unexpected transfer account response');
  }
  return {
    virtual_account_id: account.id, customer_id: expectedCustomer, reference: account.reference,
    account_number: String(account.account_number), bank_name: String(account.account_bank_name).slice(0, 120),
    account_name: typeof account.account_name === 'string' ? account.account_name.slice(0, 120) : null,
    note: typeof account.note === 'string' ? account.note.slice(0, 500) : null,
    amount, currency: account.currency, expires_at: new Date(expires).toISOString(),
  };
}
function transferResponse(donation, transfer) {
  const { account_number, bank_name, account_name, note, amount, currency, expires_at } = transfer;
  const details = { account_number, bank_name, account_name, note, amount, currency, expires_at };
  return { tx_ref: donation.tx_ref, status: 'pending', next_action: { type: 'bank_transfer', bank_transfer: { ...details, expired: Date.parse(details.expires_at) <= Date.now() } } };
}
module.exports = { configuredMethods, methodsFor, methodCatalog, operationKey, customerId, normalizeTransfer, transferResponse };
