# Contact inbox and Church Store

## Staff use

- `/admin/contact`: sign in with the existing editorial account, review messages, prepare a reply in your email application, then mark read/replied/archived. The website saves messages; it does not send email alerts or automatic replies.
- `/admin/store`: add real products, approved NGN prices and actual available quantities. Save a draft or publish. Select an existing site image. No sample products, prices or stock were seeded.
- Orders are collection-only at the ministry address shown on the website. Agree collection times and any return/refund arrangements with the buyer. Shipping and digital fulfilment are not included.
- Staff can verify a payment with Flutterwave and mark a verified paid order collected. There is no manual “mark paid” action.

## Checkout and payment safeguards

The API validates cart IDs and integer quantities, and the database locks product rows in a consistent order. It computes totals from stored prices and saves immutable order-line snapshots. Client-supplied prices are ignored. Repeated creation with the same UUID, secret and request returns the original order without reserving stock twice. Changed details with the same identity are rejected.

A buyer's random 256-bit order secret stays in that browser tab's session storage. Only its SHA-256 digest is stored by the server. Private order reads/actions require that secret; IDs and payment references alone do not grant access. Do not publish order links containing secrets. Cart storage contains IDs/quantities only. Closing the tab can lose checkout access: keep the order reference and contact staff for assistance before paying again.

Unstarted reservations last 15 minutes. Bounded cleanup on catalogue reads/new checkouts releases expired **pending** reservations. Cancellation restores those quantities exactly once. Product revision checks stop a stale staff form from overwriting reservation-related stock changes.

For payment, an atomic pending-to-initializing transition claims the order before a provider request. The existing Flutterwave v4 integration creates an NGN dynamic bank-transfer account with the order amount/reference and stable idempotency keys. Amount and any provider fee are displayed before the buyer transfers in their banking app. This website collects no card number, CVV, BVN, NIN or banking password for Store checkout. Account details expire and must never be reused.

After an uncertain initialization, retries perform read-only lookup by the original reference. They never silently create another account. There is deliberately no automatic stock release or new-payment button after initialization. If no account can be recovered, or an initialized account expires unpaid, staff must reconcile the reference in Flutterwave before any manual inventory adjustment. Do not compensate for pending payments by increasing stock. This conservative hold avoids overselling when payment status is uncertain; a fully automated cancellation/refund workflow is outside this release.

Only a server retrieval of a succeeded charge with the exact reference, goods amount, NGN currency and expected customer marks the order paid. Webhooks use the existing raw-body HMAC signature check and then retrieve the charge independently. Duplicate events are safe. The buyer can also click Check payment status; that action creates no payment.

## Deployment and access

`backend/contact-store-schema.sql` was applied to the existing CRH Supabase project. All three tables have RLS enabled, anon/authenticated access revoked, and explicit service-role grants. The three stock RPCs use SECURITY INVOKER, a fixed search path, and server-only EXECUTE grants. Staff APIs validate confirmed Supabase users and server-maintained app_metadata roles on every request.

The existing Render backend and Vercel frontend auto-deploy from main. No additional paid service or environment variable is required. Bank transfers must remain enabled in the existing DONATION_PAYMENT_METHODS configuration. Existing Flutterwave credentials and webhook configuration are reused. Render free-tier cold starts still apply. Request limits are process-local, bounded, and reset on restart; they are not a distributed fraud-prevention service.

The Supabase advisor still reports the existing set_updated_at search-path warning, public donation_types GraphQL visibility, and disabled leaked-password protection. The new tables' “RLS enabled, no policy” INFO findings are intentional: the browser has no table grants and all access goes through the authorised backend. Unrelated platform security settings were not changed.

## Validation and limits

79 frontend tests and 110 backend tests pass, including contact retry/error states, staff login isolation, cart validation, secret-gated orders, concurrent payment claim, uncertain-request recovery, exact charge matching, webhook routing and stale catalogue edits. The production build passes. Transactional tests on the actual database checked server prices, stock depletion, idempotency, oversell rejection, cancellation and unpublished products; all test data was rolled back. No real payment, refund or financial transaction was made. A real buyer's transfer/settlement rehearsal still requires the owner and an approved real product.

## Rollback

Revert the application commit/PR through the normal GitHub workflow. Keep the additive database tables and transaction records for audit; do not drop orders or manually restock initialized payments. To pause sales, unpublish products through the staff desk. Reconcile outstanding references before altering inventory or arranging provider-managed refunds.
