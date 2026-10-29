# Donation confirmation persistence repair

A live USSD transaction was verified against Flutterwave, but the donation update and webhook handling returned Supabase HTTP 400. The payment is confirmed at the provider; a local database warning must never prompt a second payment.

## Findings and limits

The repository contains two donation schema definitions. `database/schema.sql` accepts the legacy `verified` status, while `database/supabase-donations.sql` also accepts `successful`. `CREATE TABLE IF NOT EXISTS` does not reconcile an already-existing table. Optional diagnostic/audit columns also differ between the definitions.

These are possible causes, not a confirmed inspection of the live schema. The connected Supabase account still denies access to project `yaicqepqhpskcoqcvoqf`. The old application logs reveal HTTP 400 but not its Postgres/PostgREST code. The repair adds bounded diagnostics containing only response status, code and allowlisted schema identifiers; raw row details, donor data and provider payloads are excluded.

## Repair

- On an explicit rejection by `donations_status_check`, an attempted `successful` write retries using the existing `verified` representation. The API already normalizes that value to confirmed success. It still requires provider verification of the payment.
- On an explicit PostgREST missing-column rejection, only known optional verification/audit columns can be omitted on retry. Status, transaction identifiers, amounts, currency and metadata are never discarded. Unrelated constraints, authorization failures, timeouts and ambiguous failures do not activate compatibility retries.
- A successful update must return a saved row; an empty result is not accepted as persistence.
- Verification separates donation persistence from payment-event creation. An event failure after a successful save reports an audit reconciliation warning instead of falsely saying the donation update failed.
- Webhooks save the verified donation before recording its event. Event errors still return HTTP 500 so the provider can redeliver.

No schema, grants or RLS policies are changed. No service credentials are exposed and no new charge or transfer is initiated. Optional-column omissions and legacy status fallback are logged so a maintainer can reconcile the database schema after access is restored.

## Validation

52 backend tests pass, covering explicit legacy status/missing-column errors, unchanged essential fields, authorization/constraint failures, timeouts, no-row writes, privacy-safe diagnostics, audit failures, webhook save ordering and existing payment flows. Live persistence remains unverified until deployment and rechecking the already-paid reference.

If the live error falls outside these narrowly recognized cases, preserve the confirmed provider result and use the new safe diagnostic code to guide reconciliation. Restore authorized Supabase access before attempting a database migration or policy change.
