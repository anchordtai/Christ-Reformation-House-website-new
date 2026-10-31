# CRH support and security — first release

## Included

- `/help`: ten searchable, categorised prepared answers linked to the church's existing pages. The ministry guide also links to help and staff chat. Meeting wording now describes the embedded call and omits the obsolete public-service time limit.
- `/support`: private, stored conversations with church staff, separate from the prepared-answer guide. First name/alias, explicit storage consent and a random per-tab access secret are required. No email address is required, and no message is sent to a generative AI provider.
- `/admin/support`: existing confirmed editorial/event/admin accounts can read/reply/close chats, explicitly indicate availability, and inspect the latest security activity. This reuses the same staff authorisation model as the existing Store/contact desks; it does not create accounts or grant new roles.
- API and static-page nosniff/referrer headers; identifying Express header disabled. Editorial authorisation now requires a confirmed email. Sign-in limits combine bounded broad and hashed-email buckets instead of applying the small limit to every visitor behind a shared proxy.
- Metadata-only audit records of staff POST requests and editorial login attempts; availability heartbeats excluded. Actor IDs come only from verified server identities. Logs contain route patterns and outcome codes, never request bodies, passwords, chat text, tokens, payment details, email addresses or raw IPs. Audit-save failure is logged safely and does not roll back an otherwise successful action. It is an activity log, not a threat detection service; no alert email is configured.
- Compatible dependency updates: backend npm audit reports zero vulnerabilities, down from seven including two critical. Frontend audit is reduced from 22 findings to 15 (14 moderate, one high); Vite/esbuild/lint tooling and React Router findings require a separately tested major migration. The high finding is in Vite development tooling, not the deployed static serving layer. Do not represent the entire site as vulnerability-free.
- Weekly Dependabot update proposals for root and backend manifests; no automatic merge. Netlify Node build runtime brought to 24, matching the tested local/backend runtime.

## Staff operation

Open `/admin/support` and sign in with the existing editorial account. Click **Mark me available for chat** only while actively accepting enquiries. Keep the desk visible. Availability is refreshed while active and expires after 90 seconds without a heartbeat; it signals recent staff presence, not a promise of an immediate reply. Other staff may independently remain available.

Select a conversation to reply as **Ministry team**. Replies and new messages refresh every ten seconds while the page is visible. Chats are capped at 100 messages and seven days of access. Close a conversation when finished. Closed and expired threads reject new messages; exactly matching retries remain idempotent. Visitors need to keep their original browser tab for access. They can use the displayed WhatsApp/contact routes if they lose access. No typing indicators, email/push notifications, read receipts or 24-hour staffing are claimed.

Use chat for general enquiries. Avoid confidential counselling and identifying/payment secrets. Stored conversations are accessible to authorised staff and are not end-to-end encrypted. Seven-day access expiry does not erase records. A retention/deletion policy and any automatic purge need an explicit owner decision; no stored ministry records were deleted in this change. Supabase free storage and service quotas still apply.

## Bot verification activation — remaining owner setup

The Contact form and first staff-chat message have Cloudflare Turnstile integration prepared, including mandatory server-side verification of success, action and exact approved hostnames. It is **not active without real keys**.

1. In the owner's Cloudflare account, create a free Turnstile widget for `christreformationhouse.org.ng` and `www.christreformationhouse.org.ng`.
2. Set `TURNSTILE_SITE_KEY` (public site key) and `TURNSTILE_SECRET_KEY` (private server secret) on the existing Render backend. Do not paste the private secret into chat or commit it to Git.
3. Redeploy Render. No frontend key or DNS/nameserver change is required: the client reads only the public site key from `/api/support/config`.
4. Test both contact and new-chat forms, including expired/failed challenges. The backend expects `contact` or `chat` actions respectively and permits only the two production hostnames. Development/preview hosts are intentionally not allowed for real production keys.

If neither key exists, the current validation, honeypot/contact checks and rate limits remain in effect and the staff desk explicitly reports verification as not activated. If only one key exists, protected submissions fail closed with an actionable configuration message; they cannot silently bypass verification. Existing-chat replies use secret-gated access and message limits, without a repeated CAPTCHA. Staff sign-in, event/comment forms and payments are not Turnstile-protected by this release.

## Data and security model

The applied `backend/support-schema.sql` adds threads, messages, staff presence and audit tables. All have RLS enabled, anon/authenticated grants revoked and explicit service-only grants. The append RPC is SECURITY INVOKER with fixed search_path and server-only EXECUTE. It serialises each thread, verifies visitor access, enforces expiry/status/message count and deduplicates message UUIDs. Staff message author IDs are supplied by the verified backend, never accepted from a client body. Public API responses omit access hashes, staff identifiers and audit data. IDs alone do not authorise a transcript. Secrets travel in Authorization headers and never in URLs.

The schema also pins the search_path on the existing `set_updated_at` trigger, removing that advisor warning. Existing public donation_types GraphQL visibility and disabled Supabase leaked-password protection remain documented platform advisories. The tables' “RLS enabled, no policy” INFO findings are intentional: all browser grants are revoked and access goes through the authorised server. No DNS, email, payment processor, staff credential or paid-plan setting was changed. Request throttles/audit caps are bounded and process-local; they reset on restart.

## Verification and remaining work

Frontend/backend tests cover prepared-answer search, consent, preserved drafts, retry identity, escaped transcript text, staff login isolation, session privacy, spoofed author rejection, expired presence, Turnstile hostname/action checks and fail-closed configuration. Transactional tests on the actual database verified retry deduplication, cross-session rejection, closed/expired threads and message limits, with all fixtures rolled back. A human staff member still needs to sign in and rehearse a visitor-to-staff conversation on separate devices. Bot challenges require real owner keys before live validation.

Generative AI responses, MFA enrolment, automated security alerts, AI moderation and semantic sermon search are subsequent work, not enabled features. No AI API account, paid subscription, outbound social post, broadcast, financial transaction or new staff credential was created.

## Rollback

Revert the application commit through the normal GitHub process. Keep chat/audit tables for continuity and audit rather than deleting records. Removing both Turnstile environment variables returns to the previous validation/rate-limit mode; do this only as an intentional owner security decision. A code rollback alone leaves the additive tables private with their grants intact.
