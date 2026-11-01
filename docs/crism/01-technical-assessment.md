# CRISM — Phase 1 technical assessment

**Institution:** Christ Reformation International School of Ministry (CRISM)  
**Affiliation:** Christ's Reformation House International Inc.  
**Prepared for:** Apostle (Dr.) Anchord Taiwo  
**Assessment date:** 1 November 2026, Africa/Lagos  
**Repository baseline:** `42f925afeb85aefff754861397c15c84df76dd60` (merged PR #33)  
**Status:** Phase 1 inspection completed. This assessment does not establish an operational school, open admissions, create student accounts, or confer accreditation.

## Executive decision

Build CRISM as a separately branded, modular institutional application under `/crism` in the existing repository. Reuse the deployment pipeline, Supabase project and verified provider clients. Give CRISM its own authorization, academic records, financial ledger and private document storage. Do not clone the church's donation records into tuition or treat devotional-editor permissions as academic authority.

The existing stack is suitable for a controlled prototype. An institution serving thousands of students, timed examinations and large video libraries needs capacity testing, reliable backups and provider-plan decisions before production commitments. No paid resources or subscriptions have been added.

## 1. Existing frontend architecture

| Item | Verified implementation | CRISM implication |
| --- | --- | --- |
| Framework | React 18; Vite 8.3.5; React Router 7.18.5; JavaScript/JSX | Add lazy-loaded CRISM modules without rewriting the church application. |
| Styling | Tailwind 3 plus feature CSS, including `platform.css` and `blog.css` | Namespace new styles under a CRISM root. Use navy, gold, white and restrained burgundy. |
| Routing | BrowserRouter and route list in `src/App.jsx`; Vercel SPA rewrite | `/crism/*` is unoccupied. Add nested routes and a CRISM-specific layout. |
| Shared shell | Header, footer, ministry assistant and seasonal ribbon currently surround all routes | Isolate the institutional shell deliberately; retain the church shell on existing routes. Keep affiliation links rather than duplicating church navigation. |
| Components | Accessible form patterns, validation/loading states, pagination, route metadata, image optimization | Reuse patterns, not ministry-specific assumptions. CRISM metadata should identify the institution. |
| General authentication | `AuthContext` treats a locally stored token as authenticated; validation is explicitly optional. `Signup.jsx` simulates registration without creating an account, while general login references `/api/auth/login`, which is not mounted by the inspected backend. | Not a working applicant identity system or an authorization boundary. Build real CRISM signup/login before student access. |
| Staff authentication | Separate sessionStorage token `crhDevotionalEditorToken`; real Supabase-backed editorial login | Provider identity validation is reusable, but that login requires editorial permission and is unsuitable for applicants/students. |
| Content | Mix of JSON sermon material and real Supabase-backed ministry modules | Static material must not be mistaken for existing LMS or academic data. |

Source evidence: `src/App.jsx`, `src/main.jsx`, `src/context/AuthContext.jsx`, `src/components/ProtectedRoute.jsx`, `src/components/StaffAccess.jsx`, `src/services/api.js`, `src/services/devotionals.js`, `package.json`.

## 2. Existing backend architecture

Express 5.3 on Node 24.14.1, native Render Node runtime. `backend/server.js` mounts feature routers for events, broadcast, support/security, chat, contact, store, meetings, journal and devotionals. Flutterwave and database helper modules are shared. Axios is used for provider and PostgREST calls; Supabase JS is available for Storage.

Existing reusable controls include explicit CORS origins, JSON body limits, response security headers, input validation, staff-token verification against Supabase Auth, server-only database credentials, bot verification and bounded rate limiters. Most rate limiters are process-local; they reset on instance replacement and do not provide durable distributed abuse protection. Blog AI daily usage is persisted atomically in Postgres.

Add `backend/crism/` with bounded routers, services, repositories, authorization, validation and tests. Keep existing routers intact. Move only genuinely shared provider/identity primitives as necessary and cover their old callers with regression tests. Never accept a caller-controlled database table, provider endpoint or redirect URL.

## 3. Live Supabase database and authentication

Project inspected: `yaicqepqhpskcoqcvoqf` (crh-database), ACTIVE_HEALTHY, region `us-east-2`, PostgreSQL 17.6.1.021. Ten existing migration-history entries were listed (30–31 October 2026); none are CRISM migrations. Read-only metadata queries found **21 public tables**, **one confirmed Auth account**, approximately **13.2 MiB total database size**, and **no Storage buckets at inspection**. Counts are a point-in-time inventory, not capacity benchmarks. No personal or payment records were retrieved for this assessment.

| Domain | Existing live tables |
| --- | --- |
| Devotionals | `devotional_entries`, `devotional_comments`, `devotional_likes` |
| Donations | `donation_types`, `donations`, `payment_events` |
| Journal | `ministry_blog_posts`, `ministry_blog_media`, `ministry_blog_comments`, `ministry_blog_likes`, `ministry_blog_ai_usage` |
| Broadcast | `ministry_broadcast` |
| Support/chat | `ministry_chat_threads`, `ministry_chat_messages`, `ministry_chat_presence`, `ministry_contact_messages`, `ministry_security_events` |
| Events | `ministry_events`, `ministry_event_registrations` |
| Store | `ministry_store_products`, `ministry_store_orders` |

All 21 public tables have RLS enabled. Only active `donation_types` has an anon/authenticated SELECT policy and browser-role table grants. The other tables intentionally use the trusted backend; no-policy RLS blocks browser-role access and is not evidence that those tables lack backend protection. The service role bypasses RLS, so each backend endpoint must perform complete authorization.

The three inspected `crh_blog_*` RPCs are security-invoker functions, not SECURITY DEFINER. Existing church permissions are verified from trusted `app_metadata`, not editable `user_metadata`.

Supabase security advisors reported: 20 informational no-policy findings consistent with server-only access; public and authenticated GraphQL visibility of the public donation-type catalogue; and disabled leaked-password protection. Do not open student tables to clear informational warnings. Confirm supported plan features before any Auth-security change, and avoid partial MFA enforcement that locks out existing hosts/editors.

No CRISM tables, academic identities, admissions, enrollments, grades or certificates currently exist. Storage code can lazily create the private `crh-blog-media` bucket after the first upload; that is not an existing student-document store.

**Schema source caution:** `database/schema.sql` and `database/README.md` describe an older broad Neon design. They do not describe the inspected live Supabase schema. Do not run that file against production as a CRISM migration. Reconcile actual schema, incremental SQL files and migration history first.

## 4. Existing payment infrastructure

Flutterwave V4 uses OAuth client credentials, a validated API base URL, server-side card encryption, charge retrieval, dynamic bank-transfer accounts, stable idempotency keys and webhook HMAC verification. The donation flow compares reference, currency and amount before confirming value. Store orders are already dispatched separately during webhook handling.

NGN configuration offers card, bank transfer, USSD and OPay; configured international currencies include USD, GBP, EUR, GHS, ZAR and KES with card availability. Configuration is not proof of merchant approval or successful settlement in every currency. The owner received a definitive merchant-disabled OPay response; Flutterwave activation remains required. Do not offer it as an operational CRISM payment method until enabled and rehearsed.

Reuse `backend/flutterwave.js` and signature/idempotency patterns. Create separate CRISM invoices, invoice lines, payment attempts, verified payments, allocations, adjustments and receipts. Use unique academic references and an explicit webhook dispatcher. Do not route tuition through `POST /api/donations` or infer a tuition balance from church donation totals. Preserve donation/store behavior with regression tests.

Amounts and fees must be calculated on the server from versioned fee schedules. Store currency and minor-unit conventions; never add unlike currencies. Reconcile refunds/reversals and duplicate webhooks. An invoice is settled only after a matching provider verification and atomic ledger allocation.

## 5. Existing route inventory

| Domain | Existing routes / aliases |
| --- | --- |
| Home/campaign/about | `/`, `/november`, `/about` |
| Teaching/broadcast | `/watch`, `/live`, `/sermons`, `/sermons/:id`, `/admin/broadcast` |
| Ministry | `/salvation`, `/prayer-support`, `/prayer-request`, `/testimonies`, `/ministries` |
| Events | `/events`, `/events/register/:id`, `/admin/events` |
| Journal | `/blog`, `/blog/:id`, `/admin/blog` |
| Devotionals | `/devotional`, `/devotional/:date`, `/admin/devotionals` |
| Giving/store | `/donate`, `/donate/return`, `/store`, `/admin/store` |
| Contact/support | `/contact`, `/admin/contact`, `/help`, `/support`, `/admin/support` |
| Meetings | `/meetings`, `/meetings/schedule`, `/meetings/room/:id`, `/meetings/:id`, `/meetings/:id/edit` |
| Legacy general access | `/login`, `/signup`, `/admin/login`, `/social` |

`/crism` has no application route yet. A host-level HTTP 200 from the SPA fallback would not prove that a CRISM page exists. CRISM must add its own scoped not-found handling and preserve every existing route.

## 6. Hosting and deployment

| Component | Verified state | Decision |
| --- | --- | --- |
| Source | GitHub repository, production branch `main`, PR workflow | Develop isolated feature branches; release reviewed incremental changes. |
| Frontend | Vercel project `christ-reformation-house-website-new`; Vite; Node 24; custom church domains; latest production build READY | Continue using the existing project for `/crism`. Test public custom-domain routes and protected previews separately. |
| Backend | Render service `srv-da62db0jo6nc73e57fn0`, Frankfurt, Free, `backend/`, `npm install`, `npm start`, automatic deployment on commits | Keep Free as requested. Do not promise exam reliability or scale before testing and an approved hosting decision. |
| Database | Existing Supabase project | Separate CRISM names and access rules. No new paid database required for the prototype. The database is in US East while Render is in Frankfurt; measure cross-region request latency before choosing any future deployment regions. |
| Media | Render filesystem is ephemeral; private storage pattern available | Never store student documents, recordings or issued records solely on Render disk. |
| Secrets | Provider credentials are server environment variables | Reuse through backend clients. Never put service-role/payment/AI secrets in Vite variables or reports. |
| AI | `BLOG_AI_MODEL=gemini-3.5-flash-lite`; owner-authorized live short journal generation succeeded | Reuse the provider boundary only. Student AI needs a separate endpoint, limits, scope and academic safeguards. |

Vercel `vercel.json` has a crawler-only journal share rewrite and a general SPA fallback. Preserve both. Do not redirect `/crism` traffic into an unbuilt API or assume an external domain is owned. Render currently uses default socket health checks; adding a meaningful HTTP readiness path is a separate tested deployment change.

## 7. Reuse versus new development

| Capability | Reuse | Develop specifically for CRISM |
| --- | --- | --- |
| Identity | Supabase Auth identity verification | Applicant signup/recovery/session refresh, CRISM roles, enrollment-based authorization, staff MFA workflow |
| Public site | Router, deployment, shared primitives | Independent brand/layout, all institutional pages, configurable identity and publication workflow |
| Catalogue | Database/API validation patterns | Six schools, departments, versioned programmes and curriculum; proposed/open/closed states |
| Admissions | Contact form's consent, bot checks and retry ideas | Applications, documents, review stages, decisions and admission letters |
| Student/lecturer portals | Error/loading/page patterns | Course registrations, assignments, progress, grades and institution-scoped dashboards |
| Meetings | Existing JaaS and meeting-link experience | Enrollment-only classes, approved Meet/Zoom/Teams links, time zones and attendance evidence |
| Finance | Flutterwave V4 client and verification | Academic invoice ledger, fee schedules, scholarships, allocations, receipts and reconciliation |
| Documents | Image validation/private storage approach | Quarantine, safe document handling, signed downloads, letters, IDs, transcripts, certificates |
| Notifications | Existing staff inbox patterns | Durable outbox, recipient preferences, delivery receipts and verified transactional sender |
| AI | Working server-side Gemini integration | Student-only study assistant; source citations, doctrinal framing, assessment limits and separate usage budget |
| Library | Local Bible reading/resource presentation | Licensed catalogue, rights metadata, enrollment access, search and permitted downloads |
| Language | None established for institutional content | Locale dictionaries, translated curriculum/content workflow, localized notifications and dates |

Current JaaS signing explicitly disables recording, livestreaming and transcription. Existing meetings do not establish Zoom/Meet/Teams integrations, automated attendance or recording storage. Listing a meeting URL is not an attendance record.

## 8. Recommended CRISM architecture

Use a modular monolith first: one existing frontend, one existing backend, one Supabase project. Keep the institution separable for future domain migration through configurable public origin/base path, CRISM-scoped data and portable modules. No immediate microservices are needed.

Frontend: `src/crism/{layout,pages,components,services,locales}`. Backend: `backend/crism/{routes,services,repositories,authorization,validation}`. Persist schema changes as versioned migrations with explicit rollback/recovery instructions. Use Postgres transactions for academic/financial transitions, audit every privileged mutation, and store no uploaded content in audit payloads.

Prefer a private academic schema with explicit trusted-backend access. A public-facing catalogue may use a dedicated API projection. If exposed-schema tables are chosen to match existing PostgREST helpers, use `crism_` prefixes, RLS and explicit grants/policies. All access must remain institution- and ownership-scoped. Decide one schema strategy before generating migrations; never create generic `profiles`, `roles` or `payments` tables blindly.

[Detailed data domains, role matrix and delivery gates](02-architecture-and-delivery.md).

## 9. Security considerations and launch gates

1. Validate identities with Supabase; never authorize from a browser role flag or token presence. Separate academic roles from ministry staff flags. Never grant privileged roles during public signup.
2. Scope student data by owner/enrollment; lecturers by assigned course/section; deans by school. Finance permissions must not allow grade edits. Check every record identifier server-side.
3. Protect documents with private buckets, allowlisted types, size limits, random object keys, access checks and short-lived downloads. Passport/identity documents must not enter public storage or AI prompts. Quarantine attachments until safe handling/scanning is available.
4. Keep server-only answer keys and grading rubrics. Use server deadlines, persisted autosave, randomized question snapshots, attempt limits and transactional final submission. Browser timers cannot authorize extra time or determine final grades.
5. Release results and awards only through named institutional authorities; retain revision histories. Scholarships/payment waivers need auditable approval. Decisions affecting admission or academic standing stay human-reviewed.
6. Verify charge identity, amount, currency, invoice and owner. Deduplicate webhook/provider events. Refunds and reversals need explicit ledger treatment; do not mutate a paid flag from a return URL.
7. Prevent stored XSS in lesson/forum/library content and document previews. Use CSRF-safe cookie design if moving to cookies; limit CORS to known origins. Rate-limit login, signup, downloads, exams, certificate verification and AI independently.
8. Design backup and restore rehearsal, retention/deletion, staff offboarding, role revocation, security logs, redaction and incident response before collecting substantial student records. A migration rollback does not restore external payments or deleted files.
9. Public certificate verification should disclose only an approved minimum for a known unpredictable token, support revocation and avoid searchable student directories.
10. AI must label generated explanations, cite allowed sources, separate Scripture from interpretation, avoid private student records, and not replace assessment or pastoral/academic decisions. Do not claim authoritative Greek/Hebrew analysis without a verified lexical source.
11. No accreditation, university status, recognized degree authority, faculty qualifications, completed partnerships or invented success statistics may be published without institution-supplied evidence. Seed proposed curriculum as proposed; do not set admissions dates, fees or student counts by guesswork.
12. Test cross-user/cross-role denial, payment replay, expired exams, unsafe uploads, session expiry, failed deliveries and backup recovery before declaring the platform operational.

## 10. Implementation roadmap

| Phase | Deliverable | Acceptance gate |
| --- | --- | --- |
| 1 | This repository/live infrastructure assessment | Source and live schema distinguished; integration boundaries documented. Completed. |
| 2 | Distinct brand and public shell; configuration, academic schema and role foundation | No fake institutional claims; direct-route/mobile/accessibility tests; deny-by-default role tests; migration rehearsal. |
| 3 | Schools/programmes, admissions and students | Configurable catalogue; real application tracking; private documents; auditable human decision; admitted-to-enrolled transition. |
| 4 | Student and lecturer portals | Verified sign-in, owner/course scoping, registration/progress dashboards; no placeholder links. |
| 5 | LMS and live classrooms | Published lessons, safe materials, resume/progress, enrolled access and time-zone-correct sessions. |
| 6 | Assignments/exams/academic records | Durable attempts/autosave, server deadlines, grading/release audit, reproducible transcripts. |
| 7 | Tuition/scholarships/sponsorship | Separate verified ledger, secure webhook dispatch, approved fee schedules, reconciliation and refund tests. |
| 8 | Certificates and verification | Eligibility checks, authorized approval, signed/versioned award artifact, revocation/minimal public verification. |
| 9 | Licensed library, six-language support, optional AI study assistant | Rights-controlled resources; accessible locale fallback; references and independent AI limits/consent. |
| 10 | Security/performance/recovery audit and staged deployment | Existing CRH tests pass; full end-to-end institution flows and owner rehearsal; capacity limits documented. |

Each phase should remain deployable, with its own tests and reviewable PR. Do not merge all academic tables and every workflow as one unreviewed release. Database migrations, application release and role bootstrap must be coordinated; changes must not grant existing church staff automatic access to future student data.

## 11. Additional infrastructure and costs

The no-new-spend prototype uses existing resources. This is not an unlimited production hosting commitment.

| Area | Initial approach | Cost/capacity boundary |
| --- | --- | --- |
| Frontend | Existing Vercel deployment | Confirm current team plan and institution-use eligibility. Hobby is restricted to personal, non-commercial use; do not assume a tuition-bearing institution qualifies. No plan changed. |
| Backend | Existing Render Free | Spins down after 15 minutes idle and may take about a minute to wake. Ephemeral disk, one instance, no shell/one-off jobs; unsuitable as an uptime guarantee for timed exams. |
| Database/storage | Existing Supabase project | Current published Free allowance: 500 MB DB, 1 GB file storage, 5 GB egress, 50,000 MAU. Shared project allowances must cover CRH and CRISM. Actual organization entitlement/billing was not inspected. |
| Backups | Versioned source/schema plus a separately approved backup plan | Verify backup availability, encrypt off-platform copies and rehearse restore. Free access is not a durable backup policy. |
| Video/live teaching | Institution-owned hosted video links and existing meeting tools | Video bandwidth, storage and meeting-provider limits apply. Do not upload long recordings to free database storage or promise simultaneous broadcasting. |
| Transactional email | Provider API with verified sender and outbox | Working Zoho mail does not configure application delivery. Render Free blocks common SMTP ports. Compare current provider allowance before selecting one. |
| Documents/security | Private object storage, upload validation/quarantine | Storage egress, malware scanning, long-term archival and monitoring may need separate services later. No paid scanner was added. |
| AI | Existing Gemini key/model with separate institutional quota | Free-tier availability is model/project-specific; hard usage caps, no automatic paid fallback. |
| Payments | Existing Flutterwave merchant client | Transaction/provider fees and account/currency/payment-method approvals still apply; hosting being free does not make payment processing free. |
| Domain | Existing `/crism` path | No new domain purchase needed. Proposed external domains are unverified and confer no academic status. |

Provider references checked on 1 November 2026:
- https://render.com/docs/free
- https://supabase.com/pricing
- https://vercel.com/docs/plans/hobby
- https://developer.flutterwave.com/v4/docs/opay
- https://ai.google.dev/gemini-api/docs/pricing

Dollar estimates for a production subscription, video hosting, delivery, storage, backups and scanning should be prepared against an agreed pilot cohort and upload volume. No chargeable resources should be provisioned without owner approval. Free hosting can support a prototype; enrollment volume alone does not prove throughput capacity.

## 12. Owner decisions and material not yet available

These do not block the public identity/catalogue foundation, but they gate real admissions, fees, awards and teaching:

- Approved governance, named academic officers, role assignments and support responsibilities.
- Final motto/crest, brand approval, authorized signatures and permitted photograph use.
- Approved initial programmes, outcomes, curriculum, course credits, entry requirements, durations and award descriptions.
- Academic sessions, intake dates, application requirements, admission criteria and appeal process.
- Tuition/fees per currency, installment/refund policy, scholarship criteria and financial release authority.
- Institutional privacy/retention terms, student consent, accessibility and any rules for underage applicants.
- Verified faculty biographies and qualifications; licensed teaching/library resources and recordings.
- Email sender/provider, live-class provider accounts and expected student/concurrency/upload volumes.
- Evidence for any accreditation or regulated award claim. Until supplied, describe institutional ministry training accurately without claiming recognized degrees.

## Verification limits and work performed

Read-only inspection covered the authoritative GitHub main ref, current source archive, live database metadata and grants, aggregate Auth count, Storage bucket inventory, Supabase security advisors, Render service configuration and Vercel project deployment metadata. Source paths and live objects were compared; stale documentation was not treated as live truth. Existing payment/AI test outcomes from the current session were incorporated explicitly.

No database rows, roles, Auth settings, payments, files in cloud storage, provider secrets, DNS records, application code or live deployments were changed as part of Phase 1. This report does not claim that every old route is functional merely because it appears in the router. Further end-to-end and concurrency testing remains part of each implementation phase.
