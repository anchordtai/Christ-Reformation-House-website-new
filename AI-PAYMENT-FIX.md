# AI and OPay repair — 1 November 2026

The editorial AI accepts surrounding whitespace in Render settings, case-insensitive `true`, and a copied `models/` prefix. Placeholder keys remain disabled. The staff-only blog desk identifies incomplete settings and can refresh them without signing out. Provider access, missing model, quota and timeout failures return static, actionable messages; logs contain only category and HTTP status, never credentials or editorial material. Provider thought parts are excluded from the JSON suggestion. Editorial consent, daily quota and manual review/publishing remain required.

OPay uses Flutterwave V4's documented customer → payment method → charge flow. A customer conflict can reuse only an exact email match, and the resulting charge must match the customer. Each mutation retains its own stable idempotency key. The selected method is saved before wallet initialization. Existing-charge resumption, amount/currency/reference checks and unresolved-request protection remain in place. Definitive provider rejection returns a safe error rather than silently sending the reader to a generic failed screen. Merchant-disabled OPay has a specific explanation.

## Evidence and remaining live checks

- Production Flutterwave OAuth health returned HTTP 200 on 1 November; NGN configuration includes OPay.
- Recent production donations include rejected initializations, but the old code discarded the provider reason before logging it. These records cannot establish the precise historical OPay cause.
- No blog AI usage rows or recorded AI POST requests were present when checked. A real generation and the deployed environment values have not been verified.
- Render's connector cannot read individual environment variables. Dashboard inspection currently needs owner sign-in. Never paste an API key into chat or GitHub.
- Google/Flutterwave account availability cannot be granted by this code. Keep billing disabled. Do not enable a paid model or paid plan to complete verification.
- No live charge, donation, public article, role grant or secret was created by these tests.

After approved deployment, sign in to `/admin/blog`, refresh AI settings, and generate a suggestion from a short public brief. If Google rejects it, the staff screen and Render's `Blog AI unavailable` log identify the next configuration step. Test OPay's authorization handoff as the owner; do not make a second payment for an unresolved reference. If Flutterwave reports merchant-disabled OPay, request activation from Flutterwave or use the existing bank-transfer option in the OPay app.

Official provider references:
- https://developer.flutterwave.com/v4/docs/opay
- https://developer.flutterwave.com/v4.0/docs/payment-orchestrator-flow
- https://ai.google.dev/gemini-api/docs/troubleshooting
