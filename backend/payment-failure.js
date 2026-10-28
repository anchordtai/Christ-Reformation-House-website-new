// Publish only our own messages, never raw processor text or charge payloads.
function paymentFailure(charge) {
  if (charge?.status !== 'failed') return null;
  const processor = charge.processor_response || {};
  const text = typeof processor.message === 'string' ? processor.message.slice(0, 1000).toLowerCase() : '';
  let category = 'provider_failure';
  let message = 'Flutterwave reported that this payment failed. The ministry must check the transaction in Flutterwave for the exact cause.';
  if (/insufficient funds|not enough funds/.test(text)) {
    category = 'insufficient_funds'; message = 'The payment processor reported insufficient funds.';
  } else if (/expired card|card expired/.test(text)) {
    category = 'expired_card'; message = 'The payment processor reported an expired card.';
  } else if (/unable to decrypt|encryption|tokenization|retokeniz/.test(text)) {
    category = 'checkout_configuration'; message = 'The payment processor could not process the encrypted card details. Please contact the ministry before trying again.';
  } else if (/currency.*not supported|unsupported currency/.test(text)) {
    category = 'unsupported_currency'; message = 'The payment processor reported that this currency is unavailable for this payment.';
  } else if (/declined|do not hono[u]?r/.test(text)) {
    category = 'declined'; message = 'The payment processor reported a decline. Your bank or the ministry can help investigate.';
  }
  const code = String(processor.code ?? '');
  const safeCode = /^(?:[0-9]{1,8}|[A-Za-z][A-Za-z0-9_-]{0,31})$/.test(code) && !/[0-9]{9}/.test(code) ? code : undefined;
  return { category, message, ...(safeCode ? { support_code: safeCode } : {}) };
}
module.exports = { paymentFailure };
