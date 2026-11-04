# CRH WhatsApp — prepared integration, sending locked

## Status and provider decision

This adds to the existing communication centre, not a second ministry CRM. Existing WhatsApp links were sharing/contact links; no WhatsApp Business Platform subscription, template or delivery system existed. Existing Brevo email, SMS draft-only policy, donation, authentication and editorial systems remain intact.

Use **direct official Meta WhatsApp Cloud API**, keeping email on Brevo Free. Brevo's current plan documentation lists WhatsApp campaigns/transactional messaging as a Professional-plan add-on. WhatsApp credits are separate from the 300-email free allowance. Direct Cloud API removes that Brevo plan dependency; it does **not** make scheduled template broadcasts free.

**This implementation does not send WhatsApp messages.** The owner's FREE ONLY instruction is enforced in server code and a database check: environment flags, staff approvals, guessed balances and provider credentials cannot enable paid sends. No worker, subscription, credits, wallet, paid seat, API purchase or migration of the ministry phone is provisioned. Production activation is blocked pending the human/provider steps and live tests below. API/template review operations never represent campaign delivery.

## Implemented preparation

- Separate WhatsApp form on `/devotional` and `/subscribe`: name, international calling code, libphonenumber validation, independent unchecked consent, category choices, local time and IANA time zone; default `06:00 Africa/Lagos`. Existing email signup continues separately.
- Form gated until the official connection and webhook credentials exist. No phone is saved through the public route while disconnected. Turnstile uses the existing subscription action; honeypot and per-IP limits remain.
- Pending requests hold hashed JOIN/manage tokens. A visitor must deliberately send JOIN from the entered WhatsApp number. The signed inbound event must come from the configured WABA/phone-number ID and match that number and token; it activates consent without sending a paid confirmation.
- Stored timestamps, consent version/source and category choices. No existing donors, event attendees, email subscribers or SMS contacts are imported as WhatsApp consent.
- Preference page loads only on an explicit action; fragment tokens are removed from browser history/address display. STOP/UNSUBSCRIBE/CANCEL/END/QUIT and opt-out buttons are handled without paid auto-replies. Outstanding JOIN proofs are invalidated by STOP. Suppression is preserved. No general inbound chat manuscript is stored.
- Phone identity is unique and references the existing `communication_contacts` record. A WhatsApp-only identity has no fabricated email and grants no email/SMS consent. Existing email recipient selection explicitly excludes null email addresses.
- To link channels into one contact, a reader opens their existing **confirmed email preference link**, then chooses **Link WhatsApp to this subscriber** and verifies their own WhatsApp number. The backend validates the private email manage proof. Raw typed email/phone similarities never silently merge people or transfer consent. Separate signups without identity proof cannot safely be assumed to belong to one person; audited consolidation is future work.
- Existing trusted communication roles control the new staff tab; viewers/editors cannot list subscribers. Managers/approvers/admins see masked phone numbers and can record opt-outs. Public and authenticated Supabase roles have no table/RPC access. Functions use security invoker and fixed search paths.
- Local body-only template drafts, reviewed Meta submission, paginated status reconciliation and uncertainty handling. Approval is accepted only for exact body/category/language and supported components. Provider template-change events invalidate cached approval. A timeout becomes NEEDS_REVIEW, not an automatic duplicate submission.
- Campaign plan composer supports devotional, Sunday, midweek, event, registration, reminder, cancellation and important-update types; matching consent category is enforced. Planned dates are stored in UTC and displayed in Nigeria time. Plans remain unsent and cannot enter `scheduled` state. Cancelling uses revision checks. Duplicate save keys reconcile rather than replacing another plan.
- Utility templates are restricted to specific registration confirmations in this release. These require an upcoming published event, an exact registration matching the subscriber's confirmed linked email identity, and active WhatsApp event consent. No generic event audience is treated as registered.
- Full released devotional preview includes exact title, main passage/reference, manuscript, key lessons, faith declaration, personal/church prayers, CRH branding and canonical dated link. Only the current Lagos date, reviewed/released editorial revision is accepted. No draft or previous-day replacement. No editorial status is changed.
- Full manuscripts are **not silently truncated** into templates. The supported body-only template limit is 1,024 characters including parameters; overflow blocks preparation. A pastor may prepare an approved short notification with the full-reading link. Full manuscript delivery via reviewed multipart or document-media templates is not implemented; it requires a separate provider-approved design and per-part costing.
- Pure planners test subscriber-local time/DST, exact Lagos reading date/revision, service schedules, actual event start times, consent and verified registration membership. Staff can preview current devotional and event reminder eligibility. No automatic jobs are queued. Sunday/midweek hours are not invented. Unpublishing an event is not treated as cancellation.
- Signed raw-body HMAC SHA-256 verification; strong GET verification token; WABA/phone-number scoping; event deduplication and monotonic submitted/delivered/read milestones. Unknown provider references return a retryable error for reconciliation. No real delivery is fabricated in tests.
- Aggregate subscriber/active/submitted/delivered/read/failure counters and scoped campaign job reports. Submission never means delivery. Read receipts are optional. Costs, credits consumed and available balance show **unknown**, not zero. The cost check counts eligible recipients and blocks when pricing/balance are unknown; verified-pricing estimator unit tests cover insufficient credits and per-country longest-prefix rates, but no live rate card or billing balance is connected.

## Exact human/provider setup steps

1. In the ministry owner's Meta business portfolio, create/select an app with WhatsApp Business Platform access. Use Meta's **test number** first. Record WABA ID and phone-number ID; do not confuse them with the visible phone number.
2. Add the owner's chosen test recipient and complete Meta's verification. Existing church WhatsApp app/number must keep working. Do not delete, unregister or migrate it to Cloud API without a separately approved migration or supported coexistence plan. Account verification, number OTP, terms acceptance and provider business checks need the owner's action.
3. Create a server-side token with only the necessary `whatsapp_business_management` (template management) and `whatsapp_business_messaging` permissions for the intended WABA. Select the API version currently supported for that app in Meta; do not copy the test fixture version as a production recommendation.
4. Store **only on Render backend**, never `VITE_*`, frontend, URLs, Git or staff templates:

   | Variable | Meaning |
   | --- | --- |
   | `WHATSAPP_ACCESS_TOKEN` | Scoped Meta server token |
   | `WHATSAPP_BUSINESS_ACCOUNT_ID` | WABA ID |
   | `WHATSAPP_PHONE_NUMBER_ID` | Registered/test number's internal ID |
   | `WHATSAPP_BUSINESS_PHONE` | Actual registered number in +international format |
   | `WHATSAPP_BUSINESS_COUNTRY_CODE` | Country calling code digits, e.g. `234` |
   | `WHATSAPP_APP_SECRET` | App secret used to authenticate HMAC callbacks |
   | `WHATSAPP_VERIFY_TOKEN` | Random independent verification token, at least 32 characters |
   | `WHATSAPP_API_VERSION` | Version selected from the current Meta app documentation |
   | `WHATSAPP_MODULE_ENABLED` | Keep `false` until database migration, webhook handshake and number ownership tests pass |

5. Configure the webhook URL `https://christ-reformation-house-website-new-1.onrender.com/api/communications/webhooks/whatsapp`. GET verifies `hub.challenge`; POST must pass `X-Hub-Signature-256` over the exact raw request bytes using the app secret. Subscribe the app to the intended WABA and `messages` plus `message_template_status_update` fields. A callback URL alone does not subscribe the app to the account.
6. Submit/reconcile templates through the staff WhatsApp tab. Use MARKETING for general devotional/announcement content; do not disguise it as a transaction. Meta controls approval/category and may reject variable-heavy content. This first adapter supports body-only templates; headers, media, buttons and authentication templates are intentionally rejected at reconciliation.
7. Validate the live inbound JOIN and STOP using the owner test number, including wrong-phone proof, duplicate callbacks, webhook signatures, persisted consent and email independence. Check preference link, opt-out race, provider errors and callback retries. Do not enable public collection until these pass.
8. Live **outbound** delivery testing remains blocked by the free-only send lock. To perform a future provider sandbox send, the owner must identify an authorised test number/recipient and a provider-confirmed no-charge test route; implement a narrowly scoped test harness after that verification. Do not enable production sending merely by adding credentials. No public subscribers should be test recipients.
9. For future paid campaigns, a new owner cost decision and implementation are required: verified country/category rate cards and validity dates; balance/billing reconciliation; atomic budget reservations and idempotent job claims; rate limits; paused/reclassified template recheck; current consent/cancellation/editorial revision recheck immediately before send; recording uncertain attempts without automatic retry. Preserve the successful email engine and its independent cap. This release cannot approve a paid campaign.

## Deployment / test status

Migration generated with Supabase CLI: `20261104143145_whatsapp_communications.sql`. It is additive except allowing null email for verified WhatsApp-only contacts and excluding those from email audiences. It has **not been applied to production** during this preparation.

The isolated PostgreSQL test executes the real baseline and proposed SQL, verifying ownership matching, replay protection, one phone identity, verified contact linking, independent email/SMS consent, opt-out cancellation, stale JOIN invalidation, unique campaign jobs, out-of-order status reconciliation, server-only grants/RLS and the database billing lock. Backend tests exercise real HTTP routing with mocked Meta/Turnstile adapters; React tests exercise user consent/preferences and role/cost presentation. Mocked requests do not prove a real WhatsApp delivery, template approval or free entitlement.

Live Meta credentials, account approval and an authorised test recipient were not provided. Therefore this work is prepared for review, **not claimed live or fully provider-verified**. Do not merge/deploy an enabled WhatsApp module before the prerequisite tests. Existing production email sending remains enabled and untouched.

Not live in this release: recurring WhatsApp dispatch, event registration/cancellation triggers, full-manuscript media or multipart delivery, live balance/cost ingestion, paid bulk approval, SMS sends or web push. SMS and push are reserved identity-channel types; no fake active adapters are presented.

Validation for the prepared branch: 137 frontend/database tests and 182 backend tests passed, and the Vite production build passed. Public form layout was inspected in the local browser preview; that preview cannot perform the unconfigured live Meta flow. Production Supabase schema, Render variables, Brevo configuration and live subscribers were not changed.

## Verification commands

```
npm ci
npm test
npm run build
cd backend
npm ci
npm test
```

Do not run the fixture migration/test against production: `test/whatsapp-database.test.cjs` uses an isolated in-memory PostgreSQL runtime. PGlite validates PostgreSQL semantics but is not a multi-process concurrency stress test. The live queue's future concurrency must be tested with real Postgres before enabling a send worker.

## Official sources checked 4 November 2026

- Brevo plan features: https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans
- Brevo separate WhatsApp credit pricing: https://help.brevo.com/hc/en-us/articles/4416961286674-Supported-countries-and-pricing-for-WhatsApp-messages
- WhatsApp business messaging/opt-in/template policy: https://whatsappbusiness.com/policy/
- Official Meta Postman template-message request: https://www.postman.com/meta/whatsapp-business-platform/request/o65u5m5/send-message-template-text
- Meta developer account setup: https://whatsappbusiness.com/developers/developer-hub/
- Meta pricing (requires account access for detailed current rates): https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing
- Supabase function access/RLS: https://supabase.com/docs/guides/database/postgres/row-level-security

The detailed Meta pricing page required sign-in during research, so this release does not hard-code a Nigerian unit rate, assume an old free customer-service allowance, or promise free scheduled templates.
