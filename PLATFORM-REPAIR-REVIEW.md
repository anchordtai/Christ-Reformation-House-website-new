# Ministry platform repair — review package

Prepared against main commit a5b783bf3c15f3ecc4856c93a3918a041aef1211. Prepared for a feature-branch review. No production database changes or production rollout are authorized by this document.

## Confirmed live failures

- Donation database health returns HTTP 503 with credentials configured but no provider HTTP response. This establishes database connectivity failure, not its exact cause. Render logs and Supabase project configuration are needed to distinguish DNS, timeout, incorrect URL, paused project, or another network condition.
- Flutterwave authentication health returns HTTP 200.
- GET /api/meetings returns HTTP 404: meeting backend routes are missing.
- Sermon and event API lists are empty.

## Prepared changes

| Area | Prepared behavior | Remaining release requirements |
|---|---|---|
| Donations | Normalize environment whitespace/quotes; report sanitized DNS/timeout/URL/auth/schema diagnostics; show actionable 503; clear failed, uninitialized checkout so donors can retry without starting a charge | Inspect and repair live Supabase connection; verify existing donation schema; complete a sandbox charge and signed webhook |
| Accounts | Real Supabase signup/password login/current-user validation; trusted app_metadata controls administrator status | Supabase Auth configured; signup confirmation configured; administrator assigned through trusted account management |
| Contact and prayer | Validated persistent submissions; anonymous prayer requests omit personal fields; administrator-only inbox | Apply platform schema and restore DB connectivity |
| Content pages | Real published sermons, events, blog articles, products, and date-specific devotionals; remove fabricated fallback articles and fake registration success | Publish real ministry content through workspace |
| Administration | Protected /admin workspace for content create/edit/remove and viewing contact/prayer/registration/order submissions | Configure and verify an administrator account |
| Meetings | Administrator scheduling/edit/cancel APIs; random persistent room names; guest join links; local timezone converted to UTC; calendar downloads; copy/share recovery | Apply schema; real two-device camera/microphone/screen-sharing test; configure chosen Jitsi provider |
| Video meeting embed | Correct parentNode integration; prejoin, muted media defaults, loading/error/retry, separate-tab fallback, stable callbacks, cleanup and rejoin | Public meet.jit.si may require host sign-in. Website cancellation blocks new site joins but cannot terminate a provider call. No claim of a private, authenticated video service, recordings, or Google Meet parity |
| Online service | Public viewing; provider URL from backend; YouTube/Facebook embedding; truthful unavailable state | Configure LIVE_STREAM_URL; verify a real stream |
| Store | Real product records and server-calculated order requests; saved cart through login; explicit unpaid/requested status | Commerce payments, fulfilment, inventory reservation, delivery charges and refunds are not implemented |
| Invitations | Calendar file and share link; explicit email draft that the user reviews/sends in their email app | Automatic email sending remains unconfigured and returns a truthful unavailable response |
| Social publishing | Administrator authorization and explicit unavailable response; no false published state | Connect/configure the ministry's publishing provider and test permissions |
| General reliability | API error-body display, stale response protection, duplicate form submission guard, 404 page, explicit CORS origin settings | Browser visual review, security review, and staging integration tests |

## Deployment order

1. Review this feature branch before applying schema changes or approving production rollout.
2. Connect Render and Supabase. Inspect the configured SUPABASE_URL and server logs privately; do not paste credentials into chat. Restore project availability and verify the correct service credential.
3. Apply database/platform.sql to the intended Supabase project. It creates one new RLS-enabled platform_records table. Anonymous and signed-in browser roles receive no direct table access. Server service-role credentials remain backend-only.
4. Verify the existing donation tables against database/supabase-donations.sql from the repository. Inspect current RLS/grants, then review database/donation-access.sql to deny direct browser access to financial records. Do not delete, replace, or fabricate donation records.
5. Configure Supabase Auth and a trusted administrator role. Self-registration does not grant administrative privileges.
6. Configure ALLOWED_ORIGINS, JITSI_DOMAIN, and LIVE_STREAM_URL as needed. Choose an authenticated/self-hosted Jitsi or JaaS deployment if provider-enforced host/guest access is required.
7. Deploy to staging first. Run each real end-to-end flow, including two browsers/devices joining a meeting. Then approve merge and production rollout.
8. Verify database health, signed webhook behavior, actual payment provider currency permissions, account sign-in, content publication, form persistence and admin-only access in the deployed environment.

## Verification completed locally

- 27 rendered frontend/helper tests pass, including meeting initialization, script error/retry, cleanup, callback stability, calendar escaping/UTC dates, and donation database-rejection recovery.
- 37 mocked backend tests pass, including role checks, contact/prayer persistence/privacy, missing-database errors, published content, complete meeting lifecycle, event registrations, and server-calculated order totals.
- Production Vite build passes.
- Focused undefined-variable checks pass for changed backend and major frontend files. The repository's pre-existing full lint configuration is still absent.

These tests use mocks/simulated DOM. They do not establish a working production database, settlement, email delivery, social publication, or real media connectivity. The archive contains code, schema and tests only; no production credentials or personal submissions.

## Security review additions

- Administrator permissions are verified server-side using Supabase Auth user lookup and trusted app_metadata, not user-editable metadata or browser role flags.
- Session tokens are held in tab-scoped sessionStorage rather than long-lived localStorage; logout clears both the current token and any legacy token. This is not an HttpOnly-cookie session design and does not eliminate XSS risk.
- Private API responses use Cache-Control: no-store; nosniff and referrer headers are added.
- Bounded process-local write throttling groups dynamic IDs to prevent memory-key abuse. A shared gateway limiter is still required for coordinated multi-instance protection.
- Content deletion is restricted to approved public content types and validated record identity. Private prayer/contact/order records are not deletable through public content endpoints.
- Meeting edits cannot replace the video room identity or directly change cancellation state.
- The schema enables RLS, denies direct anon/authenticated table access, and references auth.users for owner records. No schema is to be applied to an unidentified project.

Live configuration targets must be confirmed before inspecting or changing hosting settings or database contents.
