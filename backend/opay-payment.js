const provider = require('./flutterwave');
const { operationKey } = require('./payment-methods');

// The documented general flow allows returning donors to reuse a customer.
// Each provider mutation has a stable, separate idempotency key.
async function createOpayCharge({ customer, reference, amount, currency, redirectUrl, idempotencyKey }) {
  let record;
  try {
    const result = await provider.createCustomer({ ...customer.name, email: customer.email, phone: customer.phone, idempotencyKey: operationKey(reference, 'opay-customer') });
    record = result.data?.data;
  } catch (error) {
    if (error.code !== 'FLUTTERWAVE_API_ERROR' || error.providerStatus !== 409) throw error;
    record = await provider.findCustomerByEmail(customer.email);
    if (!record || record.email !== customer.email.trim().toLowerCase()) throw error;
  }
  if (!String(record?.id || '').startsWith('cus_')) throw new Error('Unexpected OPay customer response');
  const method = (await provider.createPaymentMethod({ type: 'opay', idempotencyKey: operationKey(reference, 'opay-method') })).data?.data;
  if (!String(method?.id || '').startsWith('pmd_') || method.type !== 'opay') throw new Error('Unexpected OPay payment method response');
  const response = await provider.createCharge({ customerId: record.id, paymentMethodId: method.id, reference, amount, currency, redirectUrl, idempotencyKey });
  const charge = response.data?.data;
  const owner = charge?.customer_id || (typeof charge?.customer === 'object' ? charge.customer?.id : charge?.customer);
  if (owner !== record.id) throw new Error('Unexpected OPay charge customer');
  return response;
}
function initializationFailure(error) {
  const message = String(error.providerDetails?.message || '').toLowerCase();
  if (/opay/.test(message) && /not enabled|not supported|not available|disabled|not activated/.test(message)) {
    return { category: 'opay_unavailable', message: 'Flutterwave has not enabled OPay for this ministry account. Please contact the ministry or choose bank transfer for a new gift after checking this reference.' };
  }
  return { category: 'initialization_rejected', message: 'Flutterwave rejected this checkout request. Keep your reference and contact the ministry for help before trying again.' };
}
module.exports = { createOpayCharge, initializationFailure };
