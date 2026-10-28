// Run explicitly with Flutterwave TEST credentials in the environment.
// This contacts Flutterwave's sandbox only and never writes to Supabase.
require('dotenv').config();
const crypto = require('node:crypto');
const provider = require('../flutterwave');
const { normalizeTransfer, customerId } = require('../payment-methods');

async function main() {
  if (provider.getApiBaseUrl() !== provider.SANDBOX_BASE_URL) throw new Error('Refusing: FLW_API_BASE_URL must be the Flutterwave sandbox URL. Never change production credentials to run this test.');
  if (!process.env.FLW_CLIENT_ID || !process.env.FLW_CLIENT_SECRET) throw new Error('Flutterwave sandbox credentials are required in this separate test environment.');
  const reference = 'crh-test-' + crypto.randomBytes(12).toString('hex');
  const customer = (await provider.createCustomer({ first: 'Sandbox', last: 'Test', email: 'crh-sandbox@example.com', idempotencyKey: crypto.randomUUID() })).data.data;
  const account = (await provider.createVirtualAccount({ reference, customerId: customer.id, amount: 100, currency: 'NGN', bankCode: '090567', expiry: 3600, narration: 'CRH Sandbox Test', idempotencyKey: crypto.randomUUID(), sandboxScenario: 'issuer:approved' })).data.data;
  normalizeTransfer(account, { tx_ref: reference, amount: 100, currency: 'NGN' }, customer.id);
  console.log('Sandbox dynamic account created and validated. No real transfer or production database write.');
  // Allow asynchronous sandbox processing, with bounded polling.
  for (let attempt = 0; attempt < 4; attempt++) {
    const list = (await provider.listVirtualAccountCharges(account.id)).data.data;
    const matched = Array.isArray(list) && list.find(charge => charge.reference === reference && Number(charge.amount) === 100 && charge.currency === 'NGN' && customerId(charge) === customer.id);
    if (matched?.status === 'succeeded') { console.log('Sandbox transfer verified: reference, customer, currency, amount and successful status match.'); return; }
    if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 5000));
  }
  throw new Error('The sandbox account was created but no matching successful charge was returned. Do not treat this as a completed payment test.');
}
main().catch(error => { console.error('Sandbox test incomplete:', error.code || error.message); process.exitCode = 1; });
