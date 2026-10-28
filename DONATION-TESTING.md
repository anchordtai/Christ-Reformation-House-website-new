# Donation checkout release checks

This branch changes the giving page, Flutterwave V4 authorization, duplicate initialization protection, payment recovery, and return states. It does not enable bank transfer or subscriptions. The default currency menu includes NGN, USD, GBP, EUR, GHS, ZAR, and KES; merchant-account acceptance must still be checked.

## Local setup

Use Node 24 LTS. Run `npm ci` at the root and in `backend`. Copy the root `.env.example` to `.env.local`. Copy `backend/.env.example` to `backend/.env`, set `NODE_ENV=development` and `FRONTEND_ORIGIN=http://localhost:3000`, and configure a development Supabase project and Flutterwave sandbox credentials. Never use live payment credentials for local checks.

Run the existing `database/supabase-donations.sql` schema in the development Supabase project if it has not already been applied. No additional schema migration is required: initialization claims use the existing donations.metadata JSONB column and unique tx_ref.

Start `npm run dev` at the root and `npm start` from `backend`. Frontend API calls default to Vite's local `/api` proxy. Production continues using the existing Render API URL.

## Automated checks

- `npm test` exercises the rendered giving and return pages in a simulated DOM, including authorization transitions, recovery, and status handling. It does not replace a real browser visual check.
- `npm --prefix backend test` exercises HTTP handlers with mocked Supabase and Flutterwave responses. No payment provider or real database is contacted.
- `npm run build` verifies the complete React production bundle.
- Existing repository lint has no configuration and is not claimed as passing.

## Sandbox acceptance before merging or deployment

1. Check backend `/health`, `/health/db`, and `/health/flutterwave` using sandbox configuration. Confirm browser API calls target the intended development backend.
2. Create an NGN donation. Confirm the selected donation type exists and is active in Supabase.
3. Complete card authorization for redirect/3DS, OTP, PIN, and billing address using Flutterwave's documented sandbox scenarios. Confirm that the page advances through multiple authorization steps for one charge.
4. Check that the provider's merchant return URL is not used as a bank authorization URL. Only `next_action.redirect_url.url` is followed.
5. Verify success against reference, amount, currency, and provider status. Change amount or reference in a mocked provider response and confirm no success is shown.
6. Test bank-declined, cancelled, pending, missing-reference, provider-unavailable, and delayed-confirmation outcomes. Pending and uncertain outcomes must not be presented as successful or definitively failed.
7. Double-click, submit from two tabs with the same checkout ID, and interrupt connections after donation creation, initialization claim, charge creation, and charge-ID persistence. Check the real Supabase claim filter allows only one initializer. Resume a persisted charge without submitting card details again.
8. Confirm signed webhooks recover a charge when the frontend closes or the initial response is lost. Verify invalid webhook signatures are rejected. Configure `FLW_WEBHOOK_SECRET_HASH` before release.
9. Confirm session storage contains only an opaque checkout ID; no card, PIN, OTP, name, or email. Inspect application logs to confirm payment authorization values are absent.
10. Test desktop and narrow mobile screens, keyboard focus, field labels, retry controls, and contact links.

## Operational recovery

An atomic Supabase metadata claim is saved before contacting Flutterwave. The application intentionally does not repeat initialization after an uncertain outcome, even after a restart. If the provider accepted a charge but its ID was not saved, a valid webhook can recover it. Otherwise a maintainer must reconcile the reference in Flutterwave and Supabase before clearing or resolving the attempt. Do not clear a claim merely because a request timed out.

A definitive provider initialization rejection (HTTP 400/422) is recorded as failed; an ambiguous timeout remains unresolved. The default currency allowlist includes NGN, USD, GBP, EUR, GHS, ZAR, and KES. `DONATION_CURRENCIES` overrides it, including an explicit empty value to disable all currencies. If Render still has `DONATION_CURRENCIES=NGN`, update it to the desired comma-separated list and redeploy the backend. Vercel deployment alone cannot update the Render API. Verify each enabled currency with the merchant account and sandbox. NGN remains the initial selection; changing currency clears the amount to prevent accidental reinterpretation.

Automated mocks and local browser checks do not establish that merchant credentials, account permissions, production configuration, or real payment settlement work. A completed sandbox transaction and verified webhook remain release requirements.
