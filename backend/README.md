# Backend API

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment template and add your keys (never commit `.env`):
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set at least:
   - `FLW_SECRET_KEY` – Flutterwave secret key (test: `FLWSECK_TEST-...`)
   - `FRONTEND_ORIGIN` – e.g. `http://localhost:3000` (where users are sent after payment)

3. Start the server:
   ```bash
   npm start
   ```
   Server runs on port 5000 by default.

## Donations (Flutterwave)

- **Security**: Flutterwave secret key and any other payment keys must **only** be in `backend/.env`. Never put them in the frontend or in code.
- **Flow**: User submits the donation form → frontend calls `POST /api/donations` → backend creates a pending donation and a Flutterwave payment link → frontend redirects the user to Flutterwave → after payment, Flutterwave redirects to `/donate/return` → frontend calls `POST /api/donations/verify` → backend verifies with Flutterwave and marks the donation verified.

## API

- **POST** `/api/donations` – Body: `{ amount, donationType, name, email, phone?, message? }`. Returns `{ success: true, redirectUrl }` (redirect user to `redirectUrl`).
- **POST** `/api/donations/verify` – Body: `{ transaction_id, tx_ref? }`. Returns `{ verified: true }` or `{ verified: false, error }`.

### Automatic registration confirmations

New event and meeting registrations and contact enquiries atomically queue a transactional receipt in `communication_jobs`. An after-insert trigger prevents missing emails when a request is interrupted. Unique registration keys prevent duplicate receipts. Receipts do not create marketing contacts or grant newsletter consent. Meeting registration is optional and never grants host permission. `/signup` uses the real double-opt-in community subscription flow instead of simulating account creation.

Apply the `registration_confirmations` migration before deploying this backend. The legacy claim function remains unchanged so the running backend continues to process existing subscriptions and campaigns during deployment; the new worker uses the additive claim function. Public forms use action-bound Turnstile verification. Successful requests start a bounded notification-only queue run; the existing Supabase cron remains a durable fallback if Render restarts. Subscription confirmation and welcome messages use the same immediate processing. The shared 280-attempt rolling daily cap protects the existing free Brevo allowance. Quota delays expire after 24 hours for opt-in links and two days for receipts; unresolved provider timeouts require staff review, never blind retries. Delivery reports in the Communication Desk are updated by the existing authenticated Brevo webhook. `accepted` means provider acceptance; only a delivery event sets `delivered`. No paid worker, SMS, email credits or automatic plan upgrade is enabled.

Checks: backend/API and frontend suites; `backend/test/registration-confirmations.rollback.sql` tests atomic queue creation, duplicate suppression, independent consent, bounce suppression, free cap and private access inside a rolled-back transaction.
