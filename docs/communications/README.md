# CRH communications — first delivery slice (4 November 2026)

## Release status

This is the tested first slice of the owner's phased brief, not a claim that all 15 proposed modules are complete. PR #35 is deployed. The owner subsequently approved communication-admin access for anchordtai@gmail.com. Brevo domain/sender verification and the restricted transactional-email API key are configured. See ACTIVATION.md for current scheduler and delivery evidence. No paid resources or SMS delivery were activated. CRISM is paused. Existing donor/event/contact records are **not** imported as marketing subscribers.

### Implemented

- Integrated signup on home, devotional and events pages, plus `/subscribe` and communication privacy notice.
- Consent-based categories: daily devotional, events/programmes, newsletter, services/prayer reminders. Consent is unchecked by default; event-page default is events only.
- Required existing Cloudflare verification, bounded public requests, generic signup outcomes, email normalization and duplicate prevention.
- Double opt-in with expiring, hashed confirmation tokens. Explicit POST confirmation prevents link scanners from subscribing people. Welcome queue, preference updates and unsubscribe suppression.
- Dedicated `/admin/communications` login using existing Supabase identities; server-trusted communication roles independent of devotional/meeting permissions. Reports are read-only for viewers; editors prepare drafts; manager prepares/cancels; approver reviews/schedules; communication admin has all these abilities. Global admin is also accepted. No self-service privilege grant.
- Email and SMS drafts, copy-as-new-draft, safely escaped branded HTML preview, HTTPS image, recipient-category selection, review acknowledgement, dated Nigeria scheduling, cancellation and idempotent draft save.
- SMS GSM-7/Unicode segment estimates. SMS cannot be scheduled/sent by any role in this release. No SMS provider call exists.
- Durable SQL queue, unique campaign/recipient keys, atomic claims and hard cap of 280 attempted email sends in any rolling 24 hours. Confirmation/welcome attempts consume this allowance too. No automatic provider retry after an uncertain send. An interrupted attempt becomes `needs_review`; reconcile in Brevo before any replacement.
- Daily devotional switch/time (Africa/Lagos): only that day's database reading with published/scheduled status, reviewed_by/reviewed_at and elapsed release time. Unique dated source key; original editorial revision checked again before delivery. Unsent dated jobs expire at Nigeria day's end. Switching off stops future preparation; cancel the already-created campaign separately if needed.
- Brevo adapter, one recipient per message; acceptance and provider-reported delivery are distinct. Authenticated webhook handling records delivery/bounce/failure, deduplicates events, respects event time and suppresses hard-bounce/spam/unsubscribe/invalid/blocked contacts. Opens/clicks are not collected.
- Existing Supabase Cron runs the fixed Render queue endpoint every 15 minutes, with its worker credential in Supabase Vault. The GitHub workflow is manual-only emergency fallback and has no automatic schedule. No paid Render cron/worker is used.
- The initial release adds 8 server-only tables; activation adds communication_worker_invocations for scheduler history. Initial tables: contacts, tokens, consents, campaigns, jobs, activity, settings, delivery_events. RLS enabled; anon/authenticated grants revoked; RPCs service-role-only and security invoker. No existing tables are altered.

## Free-plan decision and constraints

Brevo Free currently offers 300 email sends/day. Resend Free offers 100/day and 3,000/month. Prefer Brevo for this ministry; use a dedicated application API key and reserve the spare 20 sends for safety. Provider limits also include sends from outside this application. API acceptance, inbox delivery and engagement are different outcomes.

Do **not** add a card, prepaid credits, paid email automation, paid seats, dedicated IP, SMS wallet or auto top-up. The custom ministry desk avoids requiring each staff member to have a Brevo marketing seat. SMS via Brevo/Termii/Africa's Talking requires paid live delivery; trial/sandbox credits are not a permanent free service. Keep it disabled under the owner's instruction. No paid fallback is implemented.

A few hundred free daily sends cannot deliver one daily message to thousands of subscribers. Regular campaign overflow waits for a later worker and expires after two days; dated devotionals expire that same day. Do not advertise unlimited daily delivery. The worker processes up to four sends/run; it is bounded for Render Free and can be delayed by cold starts and scheduler load.

Supabase Cron dispatches the queue through pg_net with a 240-second timeout to accommodate Render cold starts. Cron and HTTP outcomes are distinct: inspect cron.job_run_details plus net._http_response and communication_worker_invocations. Free-service suspension or capacity limits can delay delivery; this is not a high-availability guarantee. Render Free and existing Supabase/Vercel plans remain unchanged. The manual GitHub fallback must not be configured as a second automatic scheduler.

## Setup — no secrets in chat or source

1. Create a **Free** account at https://www.brevo.com/ using the ministry owner. Complete provider account review; do not buy credits.
2. Add `info@christreformationhouse.org.ng` as sender, and authenticate `christreformationhouse.org.ng` with the exact Brevo ownership/DKIM/DMARC records shown in that account.
3. Preserve working Zoho MX, SPF and DKIM. Brevo shared-IP authentication does not require replacing Zoho MX or adding a second SPF record. If the account asks for DNS changes, reconcile the existing single SPF/DMARC records; do not invent values or overwrite policy. Rehearse Zoho sending/receiving after approved DNS changes.
4. Set Render server variables only:

| Variable | Purpose / initial value |
| --- | --- |
| `BREVO_API_KEY` | Dedicated Brevo API key, kept server-side |
| `BREVO_SENDER_VERIFIED` | `false` until Brevo confirms the sender/domain; then `true` |
| `COMMUNICATIONS_EMAIL_ENABLED` | `false` until setup and rehearsal; then `true` |
| `COMMUNICATIONS_WORKER_SECRET` | Random high-entropy string, at least 32 characters |
| `COMMUNICATIONS_WEBHOOK_SECRET` | Separate random high-entropy string, at least 32 characters |
| Existing `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Reused only on backend |
| Existing Turnstile keys | Required for public subscriptions |

5. Apply `supabase/migrations/20261104113426_free_communications_foundation.sql` through the approved Supabase migration workflow **once**. It has been transaction-tested with rollback; check migration history before applying. Do not execute legacy `database/schema.sql`.
6. Grant the existing ministry owner **communication admin only** through trusted Supabase Auth administration by merging `app_metadata.communication_role="admin"` without discarding any existing metadata. Verify the exact existing account first. Never use user_metadata. Future staff: `approver`, `manager`, `editor`, `viewer`. Staff management UI/grant/revocation workflow is a later phase; do not expose an unauthenticated role endpoint.
7. Configure an **unbatched transactional** Brevo webhook at `https://christ-reformation-house-website-new-1.onrender.com/api/communications/webhooks/brevo` with `auth.type="bearer"`, token equal to `COMMUNICATIONS_WEBHOOK_SECRET`. Subscribe to delivered, hardBounce, softBounce, spam, unsubscribed, invalid, blocked and error as named in the provider's creation UI/API; incoming payload event values are normalized as documented (`hard_bounce`, `invalid_email`, etc.). Confirm actual payloads in rehearsal. No API key goes in webhook URLs. Early unknown message references return 503 for reconciliation/retry.
8. Merge/deploy frontend and backend through the existing GitHub PR workflow. Apply the additional communication_queue_scheduler migration, provision the matching worker secret in Supabase Vault under crh_communication_worker, and verify one dispatcher response. The GitHub fallback remains manual-only and inactive without an independently configured repository secret. No additional ChatGPT automation is needed.
9. Rehearse delivery using only the owner inbox. The real confirmation delivery is verified in ACTIVATION.md; owner confirmation, welcome and preference/unsubscribe interaction remain to be completed by the owner. No other contacts are emailed for testing. For the first campaign, use only a consented owner category; inspect actual recipients before approval.
10. Daily devotional preparation is enabled at 06:00 Africa/Lagos following the real worker/provider delivery rehearsal. Only confirmed, consented subscribers qualify. Use the existing editorial desk for devotional review and scheduling; this feature does not change editorial status.

## Routes

Public GET `/api/communications/config`. Public POST `/subscribe`, `/confirm`, `/preferences`, `/login` under `/api/communications`.

Private GET `/api/ministry-admin/communications?offset=0`; POST `/preview`, `/campaigns`, `/campaigns/:id/schedule`, `/campaigns/:id/cancel`, `/settings` under the same prefix. Every handler checks a verified staff identity and capability before reading/writing private data.

Worker POST `/api/communications/process` uses the worker bearer secret. Provider POST `/api/communications/webhooks/brevo` uses a **different** webhook bearer secret.

## Verification evidence

- New backend tests exercise consent/validation, safe HTML, SMS segments, trusted roles, disabled sending, worker authentication, acceptance versus delivery, uncertain sends, unsubscribe race, SMS send prohibition, exact-date reviewed devotional preparation and webhook authentication/reconciliation.
- Frontend component tests exercise default opt-ins, inactive sender state, deliberate confirmation/unsubscribe and no pre-login private requests. Production build passes. Final regression totals: 132 frontend tests and 165 backend tests pass, including 5 new frontend tests and 14 new backend tests.
- PostgreSQL transactional test creates the proposed schema, checks signup/claim/token replay/welcome deduplication/unsubscribe/role grants/free quota, then rolls back all tables and fixtures. No real subscriber or payment record is created.
- Live DNS authentication, worker dispatch and an authenticated real Brevo delivery callback were verified on 4 November 2026; see ACTIVATION.md. One owner-only confirmation email was delivered. SMS remains disabled. Owner confirmation and welcome/preferences/unsubscribe interaction remain pending; no public CAPTCHA was solved during this test.

## Next slices — not yet implemented

Complete the live provider rehearsal before expanding this release. The remaining brief includes rich-text/template library editing, test-send wizard, campaign editing with renewed approval, recurring service/newsletter templates, staff/group management and audited grants/revocation, CSV consent-aware import/export/search/tags, paginated campaign/recipient reports and aggregate charts, event registration transactional receipts/reminders/update/cancellation rules, privacy retention jobs and donation acknowledgements triggered only by verified settlement. These must be separate tested slices; no donation or event payment behavior is changed here.

SMS opt-in UI, verified phone identity, SMS delivery adapter, SMS approval/scheduling and DLR integration remain inactive pending a future owner decision that permits paid carrier delivery. Do not activate a paid SMS path under the current free-only scope. Push notifications could be evaluated separately if the owner wants a free browser channel; they are not SMS.

## Sources checked 4 November 2026

- https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan
- https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans
- https://resend.com/pricing
- https://help.brevo.com/hc/en-us/articles/208717449-Supported-countries-and-pricing-for-SMS-messages
- https://termii.com/pricing
- https://developers.brevo.com/reference/send-transac-email
- https://developers.brevo.com/docs/heterogenous-versions-batch-emails
- https://developers.brevo.com/docs/secured-webhooks
- https://developers.brevo.com/docs/transactional-webhooks
- https://help.brevo.com/hc/en-us/articles/12163873383186-Authenticate-your-domain-with-Brevo-Brevo-code-DKIM-DMARC
- https://docs.github.com/en/actions/concepts/billing-and-usage
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
