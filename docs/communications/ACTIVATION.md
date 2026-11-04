# Email activation — 4 November 2026

## Verified live configuration

- PR #35 is merged: main commit `9967d59b003610a0200d794dd1c2114d58c5f8a2`; website and Render backend deployed.
- The original communication migration is applied. Owner explicitly approved communication-admin access for `anchordtai@gmail.com`; the trusted Auth app_metadata grant is saved and audited.
- Brevo Free account: authenticated church domain, verified `info@christreformationhouse.org.ng` sender, restricted transactional-email API key saved only in Render. Phone verification was completed by the owner.
- Render `COMMUNICATIONS_EMAIL_ENABLED=true` and `BREVO_SENDER_VERIFIED=true`; independently generated worker/webhook secrets stored on the backend. No key values are included here.
- One active **outbound transactional** Brevo webhook named **CRH website email delivery** sends to the fixed `/api/communications/webhooks/brevo` endpoint using bearer authentication. Enabled events: soft/hard bounce, unsubscribe, invalid, blocked, complaint, delivered and error. Open/click/proxy tracking callbacks are not selected.
- Supabase `pg_cron` + `pg_net` run the existing Render worker every 15 minutes (minutes 7, 22, 37, 52). The worker credential is kept in Supabase Vault under `crh_communication_worker`. The SQL function is SECURITY INVOKER, executable only by its database owner; anon/authenticated/service_role execution is revoked. The endpoint only processes reviewed campaigns and consent-eligible jobs.
- GitHub workflow is changed to **manual-only fallback**. Do not activate a second automatic scheduler. No repository secret is required for the live Supabase scheduler.
- Daily devotional automation enabled at **06:00 Africa/Lagos**. This is an earliest time; the next worker run processes the queue. Only today's reviewed/released entry qualifies, and its revision is checked before delivery. Free limits and downtime may delay delivery; expiry remains authoritative.
- Existing Render service stays **Free**. No new paid worker, paid cron service, wallet credits or subscriptions are used. SMS remains disabled.

## Actual owner-only delivery test

A single confirmation message was queued for `anchordtai@gmail.com`. The contact remains **pending**, with only the devotional category, until the owner explicitly confirms via the email link. No existing donors/event participants were imported or subscribed.

The real dispatcher request returned HTTP 200, `processed: 1, state: processed`. The provider returned a message reference, and the **authenticated real Brevo webhook** subsequently marked the message **delivered**, with a delivery event at **2026-11-04 13:56:51 UTC / 14:56:51 WAT**. This is provider-reported delivery, not proof that Gmail placed it in the main inbox or that the owner opened it. No simulated delivery event or synthetic success was written.

The owner must click the confirmation link to activate the subscription and exercise the welcome-email stage. Pending status is intentional; do not bypass confirmation in SQL. Public form signup/Turnstile is enabled, but the owner-only delivery test used the existing internal subscription transaction rather than solving a visitor CAPTCHA.

## Operations

Staff desk: https://www.christreformationhouse.org.ng/admin/communications

Public subscription: https://www.christreformationhouse.org.ng/subscribe

Queue polling uses the database scheduler, not a browser or ChatGPT automation. Inspect `cron.job`, `cron.job_run_details`, `communication_worker_invocations`, `net._http_response` and delivery/job records. A cron SQL success means the HTTP request was queued; verify its HTTP result separately. `net._http_response` retention is limited, while invocation IDs are retained for 30 days. Do not select/log decrypted Vault values, HTTP request authorization headers or message bodies for routine diagnostics.

Pause scheduled invocation without deleting records: `select cron.alter_job(jobid, active := false)` for the specific `crh-communication-queue` job, using a trusted admin. Pause daily preparation from the communication desk. For a full sending stop, set `COMMUNICATIONS_EMAIL_ENABLED=false` on Render and deploy that setting. Pausing daily preparation does not cancel an already prepared campaign; cancel it explicitly.

Email safety cap remains **280 attempts per rolling 24 hours**, including confirmations/welcome messages. Uncertain sends become `needs_review` and are not blindly retried. SMS is not a free alternative and remains blocked.

Remaining product slices in README.md (rich editor, contact/group administration, broader recurring event/service automation and donation acknowledgements) are not declared complete by this activation.
