const { test, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { buildSync } = require('esbuild');
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const { Simulate } = require('react-dom/test-utils');
const { MemoryRouter } = require('react-router-dom');
const temporary = fs.mkdtempSync(path.join(process.cwd(), '.donation-test-'));
// Bundle the real JSX while substituting only the network service boundary.
// No real payment provider or remote backend is called.
function compile(name) {
  const entry = path.resolve(`src/pages/${name}.jsx`);
  let source = fs.readFileSync(entry, 'utf8').replace(/import \{ donationService \} from '..\/services\/api'/, 'const donationService = globalThis.__donationApi');
  const output = path.join(temporary, name + '.cjs');
  buildSync({ stdin: { contents: source, resolveDir: path.dirname(entry), loader: 'jsx' }, outfile: output, bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', define: { 'import.meta.env': '{}' }, external: ['react', 'react-dom', 'react-dom/*', 'react-router-dom'] });
  return require(output).default;
}
let dom, root, node, Donate, Return, api, createCalls, initializeCalls, authorizeCalls;
const config = { currencies: ['NGN'], payment_methods: ['card'], card_encryption_enabled: true };
const reference = 'crh-123e4567-e89b-42d3-a456-426614174000';
before(() => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:3000/donate' });
  global.window = dom.window; global.document = dom.window.document; global.sessionStorage = dom.window.sessionStorage; global.localStorage = dom.window.localStorage;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  api = global.__donationApi = {};
  Donate = compile('Donate'); Return = compile('DonateReturn');
});
after(() => { dom.window.close(); fs.rmSync(temporary, { recursive: true, force: true }); });
beforeEach(() => {
  sessionStorage.clear(); createCalls = 0; initializeCalls = 0; authorizeCalls = 0;
  Object.assign(api, {
    getConfig: async () => ({ data: config }),
    create: async () => { createCalls++; return { data: {} }; },
    initialize: async () => { initializeCalls++; return { data: { status: 'pending', next_action: { type: 'requires_otp' } } }; },
    authorize: async () => { authorizeCalls++; return { data: { status: 'pending', next_action: { type: 'authorize', authorization: { type: 'pin' } } } }; },
    verify: async () => ({ data: { verified: false, status: 'pending' } }),
  });
  node = document.createElement('div'); document.body.appendChild(node); root = createRoot(node);
});
afterEach(async () => { await act(async () => root.unmount()); node.remove(); });
async function render(Component, route = '/donate') {
  await act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: [route], future: { v7_startTransition: true, v7_relativeSplatPath: true } }, React.createElement(Component))));
}
async function fill(id, value) {
  const input = node.querySelector('#' + id); assert.ok(input, `Missing ${id}`);
  await act(async () => { input.value = value; Simulate.change(input); });
}
async function submit() { await act(async () => { Simulate.submit(node.querySelector('form')); }); }
async function fillGift() {
  for (const [id, value] of Object.entries({ amount: '5000', name: 'Test Donor', email: 'test@example.com', 'card-number': '1234567890123456', expiryMonth: '12', expiryYear: '2099', cvv: '123' })) await fill(id, value);
}
async function click(text) {
  const button = [...node.querySelectorAll('button')].find(b => b.textContent.includes(text)); assert.ok(button, text); await act(async () => Simulate.click(button));
}

test('giving offers only server-enabled currencies and no unsupported transfer option', async () => {
  await render(Donate); assert.deepEqual([...node.querySelector('#currency').options].map(o => o.value), ['NGN']); assert.equal(node.textContent.includes('Bank Transfer'), false); assert.ok(node.querySelector('label[for="card-number"]'));
});
test('one donation progresses through OTP and PIN without another charge', async () => {
  await render(Donate); await fillGift(); await submit(); assert.equal(createCalls, 1, node.querySelector('[role="alert"]')?.textContent); assert.equal(initializeCalls, 1); assert.ok(node.textContent.includes('one-time code'));
  await fill('bank-code', '123456'); await submit(); assert.equal(authorizeCalls, 1); assert.ok(node.textContent.includes('card PIN')); assert.equal(createCalls, 1); assert.equal(initializeCalls, 1);
  const saved = JSON.parse(sessionStorage.getItem('crh-donation-checkout')); assert.deepEqual(Object.keys(saved), ['checkout_id']); assert.equal(node.querySelector('#bank-code').value, '');
});
test('double submit is guarded while the first donation request is outstanding', async () => {
  let resolve;
  api.create = () => { createCalls++; return new Promise(r => { resolve = r; }); };
  await render(Donate); await fillGift();
  await act(async () => { Simulate.submit(node.querySelector('form')); Simulate.submit(node.querySelector('form')); }); assert.equal(createCalls, 1);
  await act(async () => resolve({ data: {} })); assert.equal(initializeCalls, 1);
});
test('restored checkout resumes authorization without card fields or a new donation', async () => {
  sessionStorage.setItem('crh-donation-checkout', JSON.stringify({ checkout_id: reference.slice(4) }));
  api.initialize = async (txRef, card) => { initializeCalls++; assert.equal(txRef, reference); assert.equal(card, undefined); return { data: { next_action: { type: 'requires_otp' } } }; };
  await render(Donate); await click('Resume payment instructions'); assert.equal(createCalls, 0); assert.equal(initializeCalls, 1); assert.ok(node.querySelector('#bank-code'));
});
test('lost initialization response keeps a recoverable reference', async () => {
  api.initialize = async () => { throw new Error('Connection interrupted'); };
  await render(Donate); await fillGift(); await submit(); assert.ok(node.querySelector('[role="alert"]').textContent.includes('Connection interrupted')); assert.ok(node.textContent.includes('Check payment status')); assert.ok(sessionStorage.getItem('crh-donation-checkout'));
});
test('configuration failure blocks submission and offers a connection retry', async () => {
  api.getConfig = async () => { throw new Error('Unavailable'); };
  await render(Donate); assert.equal(node.querySelector('form'), null); assert.ok(node.textContent.includes('Retry connection')); assert.equal(createCalls, 0);
  api.getConfig = async () => ({ data: config }); await click('Retry connection'); assert.ok(node.querySelector('form'));
});
test('return page trusts verified server success and clears only the matching checkout', async () => {
  sessionStorage.setItem('crh-donation-checkout', JSON.stringify({ checkout_id: reference.slice(4) })); api.verify = async () => ({ data: { verified: true, status: 'successful' } });
  await render(Return, '/donate/return?tx_ref=' + reference); assert.ok(node.textContent.includes('Thank you for your generosity')); assert.equal(sessionStorage.getItem('crh-donation-checkout'), null); assert.ok(node.textContent.includes(reference));
});
test('unverified provider success is unresolved rather than a false success', async () => {
  api.verify = async () => ({ data: { verified: false, status: 'succeeded' } });
  await render(Return, '/donate/return?tx_ref=' + reference); assert.ok(node.textContent.includes('could not confirm')); assert.equal(node.textContent.includes('Thank you for your generosity'), false);
});
test('missing reference cannot call verification', async () => {
  let calls = 0; api.verify = async () => { calls++; return { data: {} }; };
  await render(Return, '/donate/return'); assert.equal(calls, 0); assert.ok(node.textContent.includes('reference is missing'));
});

test('pending verification remains processing after automatic rechecks expire', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  try {
    await render(Return, '/donate/return?tx_ref=' + reference);
    for (let i = 0; i < 6; i++) await act(async () => context.mock.timers.tick(4000));
    assert.ok(node.textContent.includes('still processing')); assert.equal(node.textContent.includes('Payment was not completed'), false);
  } finally { context.mock.timers.reset(); }
});

test('billing authorization submits the entered address for the same checkout', async () => {
  sessionStorage.setItem('crh-donation-checkout', JSON.stringify({ checkout_id: reference.slice(4) }));
  api.initialize = async () => ({ data: { next_action: { type: 'requires_additional_fields' } } });
  api.authorize = async (txRef, authorization) => {
    assert.equal(txRef, reference); assert.deepEqual(authorization, { type: 'avs', address: { line1: '1 Test Street', city: 'Abuja', state: 'FCT', postal_code: '900001', country: 'NG' } });
    return { data: { next_action: { type: 'requires_otp' } } };
  };
  await render(Donate); await click('Resume payment instructions');
  for (const [field, value] of Object.entries({ line1: '1 Test Street', city: 'Abuja', state: 'FCT', postal_code: '900001', country: 'ng' })) await fill('billing-' + field, value);
  await submit(); assert.ok(node.textContent.includes('one-time code'));
});

test('global currency menu follows API configuration and clears amounts when switching', async () => {
  api.getConfig = async () => ({ data: { ...config, currencies: ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'ZAR', 'KES'] } });
  await render(Donate);
  assert.equal(node.querySelector('#currency').options.length, 7);
  await fill('amount', '5000'); await fill('currency', 'USD');
  assert.equal(node.querySelector('#amount').value, '');
  assert.ok(node.textContent.includes('Amount (USD)')); assert.ok(node.textContent.includes('$25'));
  assert.ok(node.textContent.includes('Continue to payment (USD)'));
});

test('failed return displays the safe processor reason without initiating another charge', async () => {
  api.verify = async () => ({ data: { verified: false, status: 'failed', failure: { message: 'The payment processor reported insufficient funds.', support_code: '51' } } });
  await render(Return, '/donate/return?tx_ref=' + reference);
  assert.ok(node.textContent.includes('insufficient funds'));
  assert.ok(node.textContent.includes('Provider support code: 51'));
  assert.ok(node.textContent.includes('If you see a debit'));
  assert.equal(initializeCalls, 0); assert.equal(createCalls, 0);
});

function alternatives(currencies = ['NGN']) {
  api.getConfig = async () => ({ data: { ...config, currencies, payment_methods: ['card', 'bank_transfer', 'ussd', 'opay'], methods_by_currency: { NGN: ['card', 'bank_transfer', 'ussd', 'opay'], USD: ['card'] } } });
}
async function chooseMethod(type) {
  await act(async () => Simulate.change(node.querySelector(`input[name="payment-method"][value="${type}"]`)));
}
async function fillDonor() {
  for (const [id, value] of Object.entries({ amount: '5000', name: 'Test Donor', email: 'test@example.com' })) await fill(id, value);
}
function mockTransfer(expires = Date.now() + 3600000) {
  return { status: 'pending', next_action: { type: 'bank_transfer', bank_transfer: { account_number: '1234567890', bank_name: 'Mock Bank', amount: 5010, currency: 'NGN', expires_at: new Date(expires).toISOString() } } };
}
test('bank transfer needs no card or PIN and a paid button only checks pending status', async () => {
  alternatives(); let checks = 0;
  api.initialize = async (ref, method) => { initializeCalls++; assert.equal(method.type, 'bank_transfer'); assert.equal(method.card, undefined); return { data: mockTransfer() }; };
  api.verify = async () => { checks++; return { data: { verified: false, status: 'pending' } }; };
  await render(Donate); await chooseMethod('bank_transfer'); await fillDonor();
  assert.equal(node.querySelector('#card-number'), null); assert.equal(node.querySelector('#bank-code'), null);
  await submit(); assert.ok(node.textContent.includes('Mock Bank')); assert.ok(node.textContent.includes('1234567890')); assert.ok(node.textContent.includes('5,010.00'));
  assert.ok(node.textContent.includes('Do not save or reuse'));
  await click('I have paid'); assert.equal(checks, 1); assert.equal(initializeCalls, 1); assert.equal(createCalls, 1);
  assert.ok(node.textContent.includes('still awaiting confirmation'));
  assert.equal(sessionStorage.getItem('crh-donation-checkout').includes('1234567890'), false);
});
test('expired transfer details are hidden and resuming cannot create another account', async () => {
  sessionStorage.setItem('crh-donation-checkout', JSON.stringify({ checkout_id: reference.slice(4) }));
  alternatives(); api.initialize = async () => { initializeCalls++; return { data: mockTransfer(Date.now() - 10000) }; };
  await render(Donate); await click('Resume payment instructions');
  assert.ok(node.textContent.includes('This account has expired')); assert.equal(node.textContent.includes('1234567890'), false);
  assert.equal(createCalls, 0); assert.equal(initializeCalls, 1);
});
test('non-NGN currencies show only supported methods and clear card data on switching', async () => {
  alternatives(['NGN', 'USD']); await render(Donate);
  await fill('card-number', '1234567890123456'); await chooseMethod('bank_transfer'); await chooseMethod('card');
  assert.equal(node.querySelector('#card-number').value, '');
  await fill('currency', 'USD'); assert.equal(node.querySelectorAll('input[name="payment-method"]').length, 1);
  assert.equal(node.querySelector('input[name="payment-method"]').value, 'card');
});
test('USSD loads bank codes and renders instructions as text without marking paid', async () => {
  alternatives(); api.getBanks = async () => ({ data: { banks: [{ code: '044', name: 'Mock Bank' }] } });
  api.initialize = async (ref, method) => { initializeCalls++; assert.deepEqual(method, { type: 'ussd', ussd: { account_bank: '044' } }); return { data: { status: 'pending', next_action: { type: 'payment_instruction', payment_instruction: { note: 'Dial *123# <img src=x onerror=alert(1)>' } } } }; };
  await render(Donate); await chooseMethod('ussd'); await fillDonor(); await fill('ussd-bank', '044'); await submit();
  assert.ok(node.textContent.includes('Dial *123#')); assert.equal(node.querySelector('img'), null); assert.equal(node.querySelector('#bank-code'), null); assert.equal(initializeCalls, 1);
});
test('bank list failure offers a retry before USSD submission', async () => {
  alternatives(); api.getBanks = async () => { throw new Error('Unavailable'); };
  await render(Donate); await chooseMethod('ussd'); assert.ok(node.textContent.includes('could not load the USSD bank list'));
  api.getBanks = async () => ({ data: { banks: [{ code: '044', name: 'Mock Bank' }] } });
  await click('Retry bank list'); assert.ok(node.querySelector('#ussd-bank')); assert.equal(createCalls, 0);
});
test('bank-only giving loads without a card encryption key', async () => {
  api.getConfig = async () => ({ data: { currencies: ['NGN'], payment_methods: ['bank_transfer'], card_encryption_enabled: false, methods_by_currency: { NGN: ['bank_transfer'] } } });
  await render(Donate); assert.ok(node.textContent.includes('Bank transfer')); assert.equal(node.querySelector('#card-number'), null);
});
