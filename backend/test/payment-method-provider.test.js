const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const provider = require('../flutterwave');
const originalAdapter = axios.defaults.adapter;
const originalEnv = { url: process.env.FLW_API_BASE_URL, id: process.env.FLW_CLIENT_ID, secret: process.env.FLW_CLIENT_SECRET };
process.env.FLW_API_BASE_URL = provider.SANDBOX_BASE_URL;
process.env.FLW_CLIENT_ID = 'mock-client'; process.env.FLW_CLIENT_SECRET = 'mock-secret';
const requests = [];
const fixtures = new Map();
axios.defaults.adapter = async config => {
  requests.push(config);
  return { status: 200, statusText: 'OK', headers: {}, config, data: fixtures.has(config.url) ? fixtures.get(config.url) : config.url.includes('/openid-connect/token') ? { access_token: 'mock-access-token', expires_in: 600 } : { data: [] } };
};
after(() => {
  axios.defaults.adapter = originalAdapter;
  for (const [name, value] of Object.entries({ FLW_API_BASE_URL: originalEnv.url, FLW_CLIENT_ID: originalEnv.id, FLW_CLIENT_SECRET: originalEnv.secret })) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
});
test('bank transfers use the virtual account API with a dynamic account and deterministic idempotency', async () => {
  await provider.createVirtualAccount({ reference: 'crh-mock-account', customerId: 'cus_mock', amount: 100, currency: 'NGN', bankCode: '090567', expiry: 3600, narration: 'CRH Donation', idempotencyKey: 'mock-idempotency-key' });
  const request = requests.at(-1);
  assert.equal(request.url, provider.SANDBOX_BASE_URL + '/virtual-accounts');
  assert.equal(request.method, 'post'); assert.equal(request.headers.get('X-Idempotency-Key'), 'mock-idempotency-key');
  assert.deepEqual(JSON.parse(request.data), { reference: 'crh-mock-account', customer_id: 'cus_mock', amount: 100, currency: 'NGN', bank_code: '090567', expiry: 3600, account_type: 'dynamic', narration: 'CRH Donation' });
  assert.equal(request.headers.get('X-Scenario-Key'), undefined);
});
test('sandbox scenarios cannot be sent to the production API', async () => {
  const count = requests.length;
  process.env.FLW_API_BASE_URL = provider.PRODUCTION_BASE_URL;
  try { await assert.rejects(provider.createVirtualAccount({ sandboxScenario: 'issuer:approved' }), /only in the Flutterwave sandbox/); assert.equal(requests.length, count); }
  finally { process.env.FLW_API_BASE_URL = provider.SANDBOX_BASE_URL; }
});
test('sandbox scenarios are explicit and charge lookup is scoped to one virtual account', async () => {
  await provider.createVirtualAccount({ sandboxScenario: 'issuer:approved' });
  assert.equal(requests.at(-1).headers.get('X-Scenario-Key'), 'issuer:approved');
  await provider.listVirtualAccountCharges('van_mock');
  assert.equal(requests.at(-1).url, provider.SANDBOX_BASE_URL + '/charges?virtual_account_id=van_mock');
  assert.equal(requests.at(-1).method, 'get');
});

test('existing customer lookup uses exact normalized email and strips unrelated private fields', async () => {
  fixtures.set(provider.SANDBOX_BASE_URL + '/customers?page=1&size=50', { data: [{ id: 'cus_unrelated', email: 'other@example.com' }, { id: 'cus_existing', email: 'Donor@Example.com', phone: { number: 'private' } }] });
  assert.deepEqual(await provider.findCustomerByEmail(' donor@example.com '), { id: 'cus_existing', email: 'donor@example.com' });
  assert.equal(await provider.findCustomerByEmail('missing@example.com'), null);
  fixtures.clear();
});
test('account recovery queries only the supplied reference', async () => {
  await provider.listVirtualAccountsByReference('crh-existing-reference');
  assert.equal(requests.at(-1).url, provider.SANDBOX_BASE_URL + '/virtual-accounts?reference=crh-existing-reference&size=10');
  assert.equal(requests.at(-1).method, 'get');
});
