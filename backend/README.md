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
