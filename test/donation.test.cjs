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
  await render(Donate); await click('Resume bank authorization'); assert.equal(createCalls, 0); assert.equal(initializeCalls, 1); assert.ok(node.querySelector('#bank-code'));
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
  await render(Donate); await click('Resume bank authorization');
  for (const [field, value] of Object.entries({ line1: '1 Test Street', city: 'Abuja', state: 'FCT', postal_code: '900001', country: 'ng' })) await fill('billing-' + field, value);
  await submit(); assert.ok(node.textContent.includes('one-time code'));
});
