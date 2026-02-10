// netlify/functions/create-payment.js
// Creates a Flutterwave payment and records pending donation + payment.

const crypto = require('crypto');
const axios = require('axios');
const { query } = require('./db');

const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:8888';
const FLW_BASE_URL = process.env.FLW_BASE_URL || 'https://api.flutterwave.com/v3';

function generateTxRef() {
  return 'crh-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');
}

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  if (!FLW_SECRET_KEY) {
    return {
      statusCode: 503,
      body: JSON.stringify({ error: 'Payment service not configured' }),
    };
  }

  try {
    // Parse incoming JSON body
    const {
      amount,
      currency = 'NGN',
      donationType = 'general',
      name,
      email,
      phone,
      message,
    } = JSON.parse(event.body || '{}');

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid amount' }),
      };
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Valid email is required' }),
      };
    }

    const txRef = generateTxRef();

    // Insert pending donation
    const donationResult = await query(
      `INSERT INTO donations (
         amount, donation_type, name, email, phone, message, status, tx_ref, currency
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8)
       RETURNING id`,
      [numAmount, donationType, name, email, phone, message, txRef, currency]
    );
    const donationId = donationResult.rows[0].id;

    // Insert pending payment row (for gateway tracking)
    await query(
      `INSERT INTO payments (
         amount, currency, gateway, donation_type, name, email, reference, status
       )
       VALUES ($1, $2, 'flutterwave', $3, $4, $5, $6, 'pending')`,
      [numAmount, currency, donationType, name, email, txRef]
    );

    // Build redirect URL back to your frontend after payment
    const redirectUrl = `${FRONTEND_ORIGIN}/donate/return?tx_ref=${encodeURIComponent(
      txRef
    )}`;

    // Prepare Flutterwave payload
    const flwPayload = {
      tx_ref: txRef,
      amount: numAmount,
      currency,
      redirect_url: redirectUrl,
      customer: {
        email,
        name: name || 'Donor',
        phonenumber: phone || undefined,
      },
      customizations: {
        title: "Christ's Reformation House - Donation",
        description: donationType,
      },
      meta: { donation_id: donationId, donation_type: donationType },
    };

    // Call Flutterwave API to create payment link
    const flwRes = await axios.post(`${FLW_BASE_URL}/payments`, flwPayload, {
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    const flwData = flwRes.data;
    if (flwData.status !== 'success' || !flwData.data?.link) {
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: flwData.message || 'Could not create payment link',
        }),
      };
    }

    // Return the link to the frontend
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        redirectUrl: flwData.data.link,
        txRef,
      }),
    };
  } catch (err) {
    // Pass through Flutterwave errors with safe message
    if (err.response?.data) {
      const status =
        err.response.status === 401 ? 503 : err.response.status || 502;
      return {
        statusCode: status,
        body: JSON.stringify({
          error:
            err.response.status === 401
              ? 'Payment service configuration error. Please try again later.'
              : err.response.data.message || 'Payment initiation failed',
        }),
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Payment initiation failed' }),
    };
  }
};

