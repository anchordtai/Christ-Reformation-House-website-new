// netlify/functions/create-payment.js
// Netlify-safe Flutterwave payment creator

const crypto = require("crypto");
const axios = require("axios");
const { query } = require("./db");

const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN || "http://localhost:8888";
const FLW_BASE_URL =
  process.env.FLW_BASE_URL || "https://api.flutterwave.com/v3";

function generateTxRef() {
  return (
    "crh-" +
    Date.now().toString() +
    "-" +
    crypto.randomBytes(4).toString("hex")
  );
}

exports.handler = async function (event) {
  // Allow only POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  if (!FLW_SECRET_KEY) {
    return {
      statusCode: 503,
      body: JSON.stringify({
        error: "Payment service not configured",
      }),
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};

    const amount = body.amount;
    const currency = body.currency || "NGN";
    const donationType = body.donationType || "general";
    const name = body.name || null;
    const email = body.email;
    const phone = body.phone || null;
    const message = body.message || null;

    const numAmount = Number(amount);

    if (!numAmount || numAmount <= 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid amount" }),
      };
    }

    if (!email || typeof email !== "string" || email.indexOf("@") === -1) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Valid email is required" }),
      };
    }

    const txRef = generateTxRef();

    // Insert donation (pending)
    const donationResult = await query(
      `
      INSERT INTO donations
        (amount, donation_type, name, email, phone, message, status, tx_ref, currency)
      VALUES
        ($1, $2, $3, $4, $5, $6, 'pending', $7, $8)
      RETURNING id
      `,
      [numAmount, donationType, name, email, phone, message, txRef, currency]
    );

    const donationId = donationResult.rows[0].id;

    // Insert payment record
    await query(
      `
      INSERT INTO payments
        (amount, currency, gateway, donation_type, name, email, reference, status)
      VALUES
        ($1, $2, 'flutterwave', $3, $4, $5, $6, 'pending')
      `,
      [numAmount, currency, donationType, name, email, txRef]
    );

    const redirectUrl =
      FRONTEND_ORIGIN +
      "/donate/return?tx_ref=" +
      encodeURIComponent(txRef);

    const flwPayload = {
      tx_ref: txRef,
      amount: numAmount,
      currency: currency,
      redirect_url: redirectUrl,
      customer: {
        email: email,
        name: name || "Donor",
        phonenumber: phone || "",
      },
      customizations: {
        title: "Christ's Reformation House - Donation",
        description: donationType,
      },
      meta: {
        donation_id: donationId,
        donation_type: donationType,
      },
    };

    const flwRes = await axios.post(
      FLW_BASE_URL + "/payments",
      flwPayload,
      {
        headers: {
          Authorization: "Bearer " + FLW_SECRET_KEY,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    const flwData = flwRes.data;

    if (
      !flwData ||
      flwData.status !== "success" ||
      !flwData.data ||
      !flwData.data.link
    ) {
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: "Could not create payment link",
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        redirectUrl: flwData.data.link,
        txRef: txRef,
      }),
    };
  } catch (err) {
    // Flutterwave / Axios error
    if (err && err.response && err.response.data) {
      return {
        statusCode: err.response.status || 502,
        body: JSON.stringify({
          error:
            err.response.status === 401
              ? "Payment service configuration error"
              : err.response.data.message ||
                "Payment initiation failed",
        }),
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Payment initiation failed",
      }),
    };
  }
};
