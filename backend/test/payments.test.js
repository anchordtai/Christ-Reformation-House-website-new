const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const db = require('../supabase');
const provider = require('../flutterwave');
const { prepareAuthorization, encryptCardPaymentMethod } = provider;
const { initializationKey } = require('../payment-state');
process.env.FLW_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.DONATION_CURRENCIES = 'NGN';
let donation, charge, creates, claims, authorizations, dbError, providerError, updateError, eventError, virtualCreates, customers, transferCharges, lastMethod;
const fixture = () => ({ id: 'donation-1', tx_ref: 'crh-123e4567-e89b-42d3-a456-426614174000', amount: 5000, currency: 'NGN', donor_name: 'Test Donor', email: 'test@example.com', donation_type: 'general', status: 'pending', metadata: {} });
Object.assign(db, {
  getDonationByTxRef: async reference => { if (dbError) throw new Error('Database unavailable'); return donation?.tx_ref === reference ? donation : null; },
  getActiveDonationType: async () => ({ id: 'general-id', code: 'general' }),
  createDonation: async value => { donation = { id: 'donation-1', ...value }; return donation; },
  updateDonationById: async (id, value) => { if (updateError) throw new Error('Database unavailable'); Object.assign(donation, value); return donation; },
  claimDonationInitialization: async (value, key) => { claims++; if (donation.metadata.initialization_state) return null; donation.metadata = { initialization_state: 'started', initialization_key: key }; return donation; },
  createPaymentEvent: async () => { if (eventError) throw new Error('Audit unavailable'); },
});
Object.assign(provider, {
  createDirectCharge: async args => { creates++; assert.equal(args.idempotencyKey, initializationKey(donation.tx_ref)); lastMethod = args.paymentMethod; if (args.paymentMethod.type === 'card') { assert.ok(args.paymentMethod.card.encrypted_card_number); assert.equal(args.paymentMethod.card.number, undefined); } if (providerError === 'rejected') { const error = new Error('Rejected'); error.code = 'FLUTTERWAVE_API_ERROR'; error.providerStatus = 400; throw error; } if (providerError) throw new Error('Timeout'); return { data: { data: charge } }; },
  createCustomer: async () => { customers++; return { data: { data: { id: 'cus_test' } } }; },
  createVirtualAccount: async args => {
    virtualCreates++; assert.equal(args.bankCode, '090567'); assert.equal(args.expiry, 3600); assert.equal(args.currency, 'NGN'); assert.equal(args.customerId, 'cus_test');
    if (providerError) throw new Error('Timeout');
    return { data: { data: { id: 'van_test', account_type: 'dynamic', status: 'active', reference: args.reference, customer_id: args.customerId, amount: args.amount + 10, currency: args.currency, account_number: '1234567890', account_bank_name: 'Mock Bank', narration: 'CRH Donation', account_expiration_datetime: new Date(Date.now() + 3600000).toISOString() } } };
  },
  listVirtualAccountCharges: async id => { assert.equal(id, 'van_test'); return { data: { data: transferCharges } }; },
  listNigerianBanks: async () => ({ data: { data: [{ code: '044', name: 'Mock Bank' }] } }),
  retrieveCharge: async () => ({ data: { data: charge } }),
  authorizeCharge: async (id, authorization) => { authorizations++; assert.equal(id, charge.id); assert.equal(authorization.type, 'otp'); assert.equal(authorization.otp.code, '123456'); return { data: { data: { ...charge, status: 'succeeded', next_action: null } } }; },
});
const app = require('../server');
let server, base;
before(async () => { server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); base = `http://127.0.0.1:${server.address().port}/api`; });
after(async () => { await new Promise(resolve => server.close(resolve)); });
beforeEach(() => {
  donation = fixture(); charge = { id: 'chg_test', reference: donation.tx_ref, amount: 5000, currency: 'NGN', status: 'pending', next_action: { type: 'requires_otp' } };
  process.env.DONATION_PAYMENT_METHODS = 'card'; virtualCreates = 0; customers = 0; transferCharges = []; lastMethod = null;
  creates = 0; claims = 0; authorizations = 0; dbError = false; providerError = false; updateError = false; eventError = false;
});
const card = { type: 'card', card: { number: '1234567890123456', expiry_month: '12', expiry_year: '2099', cvv: '123' } };
async function post(path, body) { const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { status: response.status, data: await response.json() }; }
const initialize = () => post('/payments/initialize', { tx_ref: donation.tx_ref, paymentMethod: card });

test('bank transfer creates one dynamic account, shows provider amount including fees, and resumes without card data', async () => {
  process.env.DONATION_PAYMENT_METHODS = 'card,bank_transfer';
  const result = await post('/payments/initialize', { tx_ref: donation.tx_ref, paymentMethod: { type: 'bank_transfer' } });
  assert.equal(result.status, 200); assert.equal(result.data.status, 'pending');
  assert.equal(result.data.next_action.bank_transfer.amount, 5010);
  assert.equal(donation.status, 'pending'); assert.equal(creates, 0);
  const resumed = await post('/payments/initialize', { tx_ref: donation.tx_ref });
  assert.deepEqual(resumed.data, result.data); assert.equal(virtualCreates, 1); assert.equal(customers, 1);
});
test('concurrent bank transfer requests create only one virtual account', async () => {
  process.env.DONATION_PAYMENT_METHODS = 'bank_transfer';
  await Promise.all([1,2,3].map(() => post('/payments/initialize', { tx_ref: donation.tx_ref, paymentMethod: { type: 'bank_transfer' } })));
  assert.equal(virtualCreates, 1);
});
test('uncertain virtual account creation cannot generate a second account on retry', async () => {
  process.env.DONATION_PAYMENT_METHODS = 'bank_transfer'; providerError = true;
  assert.equal((await post('/payments/initialize', { tx_ref: donation.tx_ref, paymentMethod: { type: 'bank_transfer' } })).status, 502);
  providerError = false;
  assert.equal((await post('/payments/initialize', { tx_ref: donation.tx_ref, paymentMethod: { type: 'bank_transfer' } })).status, 409);
  assert.equal(virtualCreates, 1);
});
test('a paid button cannot confirm a pending or expired bank transfer', async () => {
  process.env.DONATION_PAYMENT_METHODS = 'bank_transfer';
  await post('/payments/initialize', { tx_ref: donation.tx_ref, paymentMethod: { type: 'bank_transfer' } });
  donation.metadata.bank_transfer.expires_at = new Date(Date.now() - 1000).toISOString();
  const result = await (await fetch(base + '/payments/verify/' + donation.tx_ref)).json();
  assert.equal(result.verified, false); assert.equal(result.status, 'pending'); assert.equal(result.transfer_expired, true);
  assert.equal(donation.status, 'pending'); assert.equal(virtualCreates, 1);
  assert.equal((await post('/payments/initialize', { tx_ref: donation.tx_ref })).data.next_action.bank_transfer.expired, true);
});
test('transfer verification requires matching reference, amount, currency and customer from the account charge list', async () => {
  process.env.DONATION_PAYMENT_METHODS = 'bank_transfer';
  await post('/payments/initialize', { tx_ref: donation.tx_ref, paymentMethod: { type: 'bank_transfer' } });
  charge = { ...charge, status: 'succeeded', customer_id: 'cus_wrong' }; transferCharges = [charge];
  let result = await (await fetch(base + '/payments/verify/' + donation.tx_ref)).json();
  assert.equal(result.verified, false); assert.equal(donation.status, 'pending');
  charge.customer_id = 'cus_test'; charge.amount = 1;
  result = await (await fetch(base + '/payments/verify/' + donation.tx_ref)).json(); assert.equal(result.verified, false);
  charge.amount = 5000;
  result = await (await fetch(base + '/payments/verify/' + donation.tx_ref)).json();
  assert.equal(result.verified, true); assert.equal(donation.status, 'successful'); assert.equal(creates, 0);
});
test('disabled methods and non-NGN alternatives fail before any provider request', async () => {
  assert.equal((await post('/payments/initialize', { tx_ref: donation.tx_ref, paymentMethod: { type: 'bank_transfer' } })).status, 400);
  process.env.DONATION_PAYMENT_METHODS = 'card,bank_transfer,ussd,opay';
  const previous = process.env.DONATION_CURRENCIES; process.env.DONATION_CURRENCIES = 'NGN,USD'; donation.currency = 'USD';
  try { for (const type of ['bank_transfer', 'ussd', 'opay']) assert.equal((await post('/payments/initialize', { tx_ref: donation.tx_ref, paymentMethod: { type } })).status, 400); }
  finally { process.env.DONATION_CURRENCIES = previous; }
  assert.equal(virtualCreates, 0); assert.equal(creates, 0); assert.equal(claims, 0);
});
test('USSD requires a provider-listed bank and submits no card information', async () => {
  process.env.DONATION_PAYMENT_METHODS = 'ussd';
  assert.equal((await post('/payments/initialize', { tx_ref: donation.tx_ref, paymentMethod: { type: 'ussd', ussd: { account_bank: 'invalid' } } })).status, 400);
  charge.next_action = { type: 'payment_instruction', payment_instruction: { note: 'Dial the mock USSD code' } };
  const result = await post('/payments/initialize', { tx_ref: donation.tx_ref, paymentMethod: { type: 'ussd', ussd: { account_bank: '044' }, card: { number: 'ignored' } } });
  assert.equal(result.status, 200); assert.deepEqual(lastMethod, { type: 'ussd', ussd: { account_bank: '044' } });
});
test('OPay submits a wallet payment and returns provider authorization', async () => {
  process.env.DONATION_PAYMENT_METHODS = 'opay';
  charge.next_action = { type: 'redirect_url', redirect_url: { url: 'https://wallet.example/authorize' } };
  const result = await post('/payments/initialize', { tx_ref: donation.tx_ref, paymentMethod: { type: 'opay' } });
  assert.equal(result.status, 200); assert.deepEqual(lastMethod, { type: 'opay' }); assert.equal(result.data.next_action.type, 'redirect_url');
});
test('bank-only configuration remains available when card encryption is absent', async () => {
  process.env.DONATION_PAYMENT_METHODS = 'card,bank_transfer,opay'; const key = process.env.FLW_ENCRYPTION_KEY; delete process.env.FLW_ENCRYPTION_KEY;
  try { const data = await (await fetch(base + '/payments/config')).json(); assert.deepEqual(data.methods_by_currency.NGN, ['bank_transfer', 'opay']); assert.equal(data.card_encryption_enabled, false); }
  finally { process.env.FLW_ENCRYPTION_KEY = key; }
});

test('initialization encrypts card details and saves the charge before returning its authorization step', async () => {
  const result = await initialize(); assert.equal(result.status, 200); assert.equal(result.data.next_action.type, 'requires_otp'); assert.equal(donation.flutterwave_transaction_id, 'chg_test'); assert.equal(creates, 1);
});
test('simultaneous initialize requests create only one provider charge', async () => {
  const results = await Promise.all([initialize(), initialize(), initialize()]); assert.equal(creates, 1); assert.ok(results.some(r => r.status === 200)); assert.ok(results.every(r => [200, 409].includes(r.status)));
});
test('resuming an existing charge does not require or submit card information', async () => {
  donation.flutterwave_transaction_id = charge.id;
  const result = await post('/payments/initialize', { tx_ref: donation.tx_ref }); assert.equal(result.status, 200); assert.equal(creates, 0); assert.equal(claims, 0);
});
test('timeout cannot become a new charge on retry', async () => {
  providerError = true; assert.equal((await initialize()).status, 502); providerError = false; assert.equal((await initialize()).status, 409); assert.equal(creates, 1);
});
test('lost database write after charging cannot create another charge', async () => {
  updateError = true; assert.equal((await initialize()).status, 502); updateError = false; assert.equal((await initialize()).status, 409); assert.equal(creates, 1);
});
test('event recording failure does not hide a created charge', async () => {
  eventError = true; assert.equal((await initialize()).status, 200); assert.equal(donation.flutterwave_transaction_id, charge.id);
});
test('invalid or expired cards are rejected before initialization is claimed', async () => {
  const result = await post('/payments/initialize', { tx_ref: donation.tx_ref, paymentMethod: { type: 'card', card: { ...card.card, expiry_month: '13' } } }); assert.equal(result.status, 400); assert.equal(creates, 0); assert.equal(claims, 0);
});
test('existing charge must match the donation amount, reference, and currency', async () => {
  donation.flutterwave_transaction_id = charge.id; charge.amount = 1; assert.equal((await initialize()).status, 409); assert.equal(creates, 0);
});
test('authorization is checked against the current bank request', async () => {
  donation.flutterwave_transaction_id = charge.id;
  const result = await post('/payments/authorize', { tx_ref: donation.tx_ref, authorization: { type: 'otp', code: '123456' } }); assert.equal(result.status, 200); assert.equal(result.data.status, 'succeeded'); assert.equal(authorizations, 1);
});
test('wrong authorization type cannot be submitted to the provider', async () => {
  donation.flutterwave_transaction_id = charge.id;
  assert.equal((await post('/payments/authorize', { tx_ref: donation.tx_ref, authorization: { type: 'pin', code: '1234' } })).status, 409); assert.equal(authorizations, 0);
});
test('replaying donation creation returns the same reference and rejects changed amounts', async () => {
  const body = { checkout_id: donation.tx_ref.slice(4), amount: 5000, currency: 'NGN', donationType: 'general', email: donation.email, name: 'Test Donor' };
  assert.equal((await post('/donations', body)).status, 200); assert.equal((await post('/donations', { ...body, amount: 1000 })).status, 409);
});
test('disabled currencies and fractional cents are rejected', async () => {
  const body = { amount: 5000, currency: 'USD', donationType: 'general', email: 'test@example.com' };
  assert.equal((await post('/donations', body)).status, 400); assert.equal((await post('/donations', { ...body, currency: 'NGN', amount: 0.001 })).status, 400);
});
test('verification rejects successful provider payments with mismatched amounts', async () => {
  donation.flutterwave_transaction_id = charge.id; charge.status = 'succeeded'; charge.amount = 1;
  const result = await fetch(base + '/payments/verify/' + donation.tx_ref); const data = await result.json(); assert.equal(data.verified, false); assert.notEqual(donation.status, 'successful');
});
test('verification confirms matching successful payments', async () => {
  donation.flutterwave_transaction_id = charge.id; charge.status = 'succeeded';
  const result = await fetch(base + '/payments/verify/' + donation.tx_ref); assert.equal((await result.json()).verified, true); assert.equal(donation.status, 'successful');
});
test('PIN is encrypted and invalid authorization values are rejected', () => {
  const value = prepareAuthorization({ type: 'pin', code: '1234' }); const encrypted = Buffer.from(value.pin.encrypted_pin, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.alloc(32, 7), Buffer.from(value.pin.nonce)); decipher.setAuthTag(encrypted.subarray(-16));
  assert.equal(Buffer.concat([decipher.update(encrypted.subarray(0, -16)), decipher.final()]).toString(), '1234'); assert.equal(JSON.stringify(value).includes('1234'), false);
  assert.throws(() => prepareAuthorization({ type: 'otp', code: 'bad' })); assert.throws(() => prepareAuthorization({ type: 'avs', address: {} }));
});
test('encrypted card does not retain raw card values', () => {
  const result = encryptCardPaymentMethod(card.card); assert.equal(result.card.number, undefined); assert.equal(result.card.cvv, undefined); assert.ok(result.card.encrypted_cvv);
});
test('frontend accepts only verified success and preserves unresolved states', async () => {
  const { paymentState, redirectUrl, authorizationType, validateCard } = await import('../../src/utils/donation.mjs');
  assert.equal(paymentState({ status: 'succeeded' }), 'unconfirmed'); assert.equal(paymentState({ verified: true }), 'success'); assert.equal(paymentState({ status: 'pending' }), 'pending'); assert.equal(paymentState({ status: 'cancelled' }), 'cancelled');
  assert.equal(redirectUrl({ redirect_url: 'https://merchant.example/donate/return' }), null); assert.throws(() => redirectUrl({ next_action: { type: 'redirect_url', redirect_url: { url: 'javascript:alert(1)' } } }));
  assert.equal(authorizationType({ type: 'authorize', authorization: { type: 'otp' } }), 'otp');
  assert.throws(() => validateCard({ number: '1234567890123456', expiryMonth: '13', expiryYear: '2099', cvv: '123' }));
});

test('definitive initialization rejection is recoverable as a failed payment', async () => {
  providerError = 'rejected';
  const result = await initialize(); assert.equal(result.status, 200); assert.equal(result.data.status, 'failed');
  const verification = await fetch(base + '/payments/verify/' + donation.tx_ref); assert.equal((await verification.json()).status, 'failed');
  assert.equal((await initialize()).data.status, 'failed'); assert.equal(creates, 1);
});

test('global currency defaults and explicit account restrictions are respected', () => {
  const { enabledCurrencies } = require('../payment-state');
  const previous = process.env.DONATION_CURRENCIES;
  try {
    delete process.env.DONATION_CURRENCIES;
    assert.deepEqual(enabledCurrencies(), ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'ZAR', 'KES']);
    process.env.DONATION_CURRENCIES = ' usd,eur,USD,INVALID ';
    assert.deepEqual(enabledCurrencies(), ['USD', 'EUR']);
    process.env.DONATION_CURRENCIES = '';
    assert.deepEqual(enabledCurrencies(), []);
  } finally { process.env.DONATION_CURRENCIES = previous; }
});

test('USD donation creation preserves the selected currency and amount', async () => {
  process.env.DONATION_CURRENCIES = 'NGN,USD,GBP,EUR,GHS,ZAR,KES';
  try {
    const result = await post('/donations', { checkout_id: '123e4567-e89b-42d3-a456-426614174001', amount: 25.50, currency: 'USD', donationType: 'general', email: 'global@example.com', name: 'Global Donor' });
    assert.equal(result.status, 201); assert.equal(donation.currency, 'USD'); assert.equal(donation.amount, 25.50);
  } finally { process.env.DONATION_CURRENCIES = 'NGN'; }
});

test('failed charge exposes only a safe explanation and code without creating a charge', async () => {
  donation.flutterwave_transaction_id = charge.id;
  charge.status = 'failed';
  charge.processor_response = { code: '51', message: 'Insufficient funds. Customer private@example.com card 1234567890123456' };
  const result = await fetch(base + '/payments/verify/' + donation.tx_ref);
  const data = await result.json();
  assert.equal(data.verified, false);
  assert.deepEqual(data.failure, { category: 'insufficient_funds', message: 'The payment processor reported insufficient funds.', support_code: '51' });
  assert.equal(donation.failure_reason, 'insufficient_funds: 51');
  assert.equal(JSON.stringify(data).includes('private@example.com'), false);
  assert.equal(JSON.stringify(data).includes('1234567890123456'), false);
  assert.equal(creates, 0);
});

test('unmatched failed charges cannot disclose processor details', async () => {
  donation.flutterwave_transaction_id = charge.id; charge.status = 'failed'; charge.amount = 1;
  charge.processor_response = { code: '51', message: 'Insufficient funds' };
  const data = await (await fetch(base + '/payments/verify/' + donation.tx_ref)).json();
  assert.equal(data.failure, undefined);
});

test('unknown processor responses stay generic and sensitive support codes are omitted', () => {
  const { paymentFailure } = require('../payment-failure');
  const result = paymentFailure({ status: 'failed', processor_response: { code: '1234567890123456', message: 'private@example.com 1234567890123456' } });
  assert.equal(result.category, 'provider_failure'); assert.equal(result.support_code, undefined);
  assert.equal(JSON.stringify(result).includes('private@example.com'), false);
  assert.equal(paymentFailure({ status: 'pending', processor_response: { message: 'declined' } }), null);
});
