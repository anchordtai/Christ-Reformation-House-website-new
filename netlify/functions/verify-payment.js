// netlify/functions/verify-payment.js
// Verifies a Flutterwave transaction and updates donations + payments.

const axios = require('axios');
const { query } = require('./db');

const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const FLW_BASE_URL = process.env.FLW_BASE_URL || 'https://api.flutterwave.com/v3';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ verified: false, error: 'Method Not Allowed' }),
    };
  }

  if (!FLW_SECRET_KEY) {
    return {
      statusCode: 503,
      body: JSON.stringify({ verified: false, error: 'Payment service not configured' }),
    };
  }

  try {
    const { transaction_id: transactionId, tx_ref: txRef } = JSON.parse(
      event.body || '{}'
    );

    if (!transactionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ verified: false, error: 'Missing transaction_id' }),
      };
    }

    // Call Flutterwave verify endpoint
    const flwRes = await axios.get(
      `${FLW_BASE_URL}/transactions/${encodeURIComponent(transactionId)}/verify`,
      {
        headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` },
        timeout: 10000,
      }
    );

    const data = flwRes.data;
    const tx = data.data;

    // Basic checks: successful, not refunded, etc.
    const isSuccessful =
      data.status === 'success' &&
      tx?.status === 'successful' &&
      !['refunded', 'reversed'].includes(tx?.status);

    if (!isSuccessful) {
      // Mark failed
      if (txRef) {
        await query(
          `UPDATE donations SET status = 'failed', transaction_id = $1, updated_at = NOW()
           WHERE tx_ref = $2`,
          [transactionId, txRef]
        );
        await query(
          `UPDATE payments SET status = 'failed', verified_at = NOW(), updated_at = NOW()
           WHERE reference = $1`,
          [txRef]
        );
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          verified: false,
          error: data.message || 'Payment not successful',
        }),
      };
    }

    const resolvedTxRef = txRef || tx.tx_ref;

    // Update donations + payments as verified/completed
    await query(
      `UPDATE donations
       SET status = 'verified',
           transaction_id = $1,
           verified_at = NOW(),
           updated_at = NOW()
       WHERE tx_ref = $2`,
      [transactionId, resolvedTxRef]
    );

    await query(
      `UPDATE payments
       SET status = 'completed',
           verified_at = NOW(),
           updated_at = NOW()
       WHERE reference = $1`,
      [resolvedTxRef]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ verified: true }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        verified: false,
        error:
          err.response?.data?.message ||
          err.message ||
          'Could not verify payment',
      }),
    };
  }
};

