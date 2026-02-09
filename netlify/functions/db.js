// netlify/functions/db.js
// Shared PostgreSQL pool helper for Netlify Functions (serverless-friendly).
// Uses a single Pool instance per warm Lambda container.

const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  // It's safe to log a warning here; the actual functions will still return
  // a 500/503 error if the DB is not configured.
  console.warn('[db] DATABASE_URL is not set. PostgreSQL will not be available.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 10000,
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query,
};

