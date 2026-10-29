const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
process.env.SUPABASE_URL = 'https://mock.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key';
const { updateDonationById, databaseDiagnostic } = require('../supabase');
const originalPatch = axios.patch;
let requests, failures, empty;
axios.patch = async (url, values) => {
  requests.push({ url, values: structuredClone(values) });
  if (failures.length) throw failures.shift();
  return { data: empty ? [] : [{ id: 'donation-1', ...values }] };
};
beforeEach(() => { requests = []; failures = []; empty = false; });
after(() => { axios.patch = originalPatch; });
const rejected = (code, message) => Object.assign(new Error('Request rejected'), { response: { status: 400, data: { code, message, details: 'private@example.com private financial data' } } });

test('legacy status constraint saves verified without changing the API success contract', async () => {
  failures = [rejected('23514', 'new row violates check constraint "donations_status_check"')];
  const input = Object.freeze({ status: 'successful', verified_at: '2026-10-29T13:00:00Z', failure_reason: null });
  const saved = await updateDonationById('donation-1', input);
  assert.equal(saved.status, 'verified'); assert.equal(input.status, 'successful'); assert.equal(requests.length, 2);
  assert.equal(saved.verified_at, input.verified_at);
});
test('missing optional columns can coexist with a legacy status constraint', async () => {
  failures = [rejected('PGRST204', "Could not find the 'failure_reason' column of 'donations' in the schema cache"), rejected('23514', 'new row violates check constraint "donations_status_check"')];
  const saved = await updateDonationById('donation-1', { status: 'successful', verified_at: '2026-10-29T13:00:00Z', failure_reason: null });
  assert.equal(saved.status, 'verified'); assert.equal(Object.hasOwn(saved, 'failure_reason'), false); assert.equal(requests.length, 3);
});
test('missing essential financial identity columns are never omitted', async () => {
  failures = [rejected('PGRST204', "Could not find the 'flutterwave_transaction_id' column of 'donations' in the schema cache")];
  await assert.rejects(updateDonationById('donation-1', { flutterwave_transaction_id: 'chg_mock', status: 'successful' }));
  assert.equal(requests.length, 1);
});
test('unrelated constraints and authorization errors are never relaxed', async () => {
  failures = [rejected('23514', 'new row violates check constraint "donations_amount_check"')];
  await assert.rejects(updateDonationById('donation-1', { status: 'successful' })); assert.equal(requests.length, 1);
  failures = [Object.assign(new Error('Forbidden'), { response: { status: 403, data: { code: '42501' } } })];
  await assert.rejects(updateDonationById('donation-1', { status: 'successful' })); assert.equal(requests.length, 2);
});
test('timeouts are not retried as schema compatibility errors', async () => {
  failures = [Object.assign(new Error('Timeout'), { code: 'ECONNABORTED' })];
  await assert.rejects(updateDonationById('donation-1', { status: 'successful' })); assert.equal(requests.length, 1);
});
test('an update returning no rows cannot be reported as saved', async () => {
  empty = true; await assert.rejects(updateDonationById('donation-1', { status: 'successful' }), /no saved record/);
});
test('diagnostics omit raw messages, donor data and row details', () => {
  const value = databaseDiagnostic(rejected('23514', 'new row violates check constraint "donations_status_check" for private@example.com'));
  assert.deepEqual(value, { status: 400, code: '23514', missing_column: null, legacy_status_constraint: true });
  assert.equal(JSON.stringify(value).includes('private'), false);
});
