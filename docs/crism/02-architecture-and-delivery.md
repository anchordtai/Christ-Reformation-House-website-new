# CRISM — architecture and delivery register

Design status: proposed, 1 November 2026. Table names below are logical entities, not claims that migrations have been applied. Use a single approved namespace strategy before implementation; do not create unprefixed objects over existing ministry data.

## Data domains and relationships

| Domain | Entities and relationships | Core constraints and indexes |
| --- | --- | --- |
| Identity/governance | profiles → auth.users; roles; permissions; role_permissions; role_assignments (user + institution/school scope); audit_logs | Unique auth identity; named role/permission keys; role scope consistency; append-only privileged audit; indexes on user/scope and event timestamp. |
| Catalogue | schools → departments; programmes → schools; programme_versions; courses → schools; curriculum_courses → programme version/course | Unique school/programme slugs and course codes; immutable published curriculum versions; credit/duration validation; publication state; catalogue/status/search indexes. |
| Academic calendar | academic_sessions → semesters; course_offerings → course/semester/lecturer; academic_calendar | Unique institutional session/semester keys; starts < ends; no invented dates; offerings reference published curriculum/course versions. |
| Applications | admissions → applicant/programme version/intake; admission_documents → application/storage record; admission_reviews → reviewer/application | Unique application reference and applicant/intake/programme; validated transition graph; conditional offer requirements; revision locking; applicant/status/intake indexes. |
| Students/faculty | students → profile/admitted application; lecturers → profile; lecturer_assignments → offering; enrollments → student/programme/session; course_registrations → enrollment/offering | Unique student number; one active identity record; unique enrollment and registration; explicit withdrawals/status; foreign keys prevent accidental cross-school links. |
| LMS | course_modules → course version; lessons → module; lesson_materials → lesson/private object; lesson_progress → registration/lesson; discussions → course/author | Published content visibility; unique lesson order; unique student/lesson progress; monotonic progress with audit reset; content/version indexes. |
| Live classes | live_classes → offering/provider; attendance → class/registration; recording/material references | UTC instants plus display zone; safe provider URLs; enrollment-gated access; deduplicated attendance evidence. Joining a link alone is not proof of attendance. |
| Assignments | assignments → offering; submissions → assignment/registration; submission_versions; assignment_grades | Deadline and extension in server time; unique submission/version; immutable graded version; scoped lecturer access; feedback and regrade audit. |
| Examinations | examinations → offering; question_bank; examination_questions; examination_options; examination_attempts; examination_answers; grading_reviews | Answer keys inaccessible to students; randomized snapshot per attempt; unique active attempt; server deadlines; unique answer/attempt-question; transactional submission and graded result version. |
| Results | grades → registration/assessment/release; academic_standing; graduation_reviews; transcripts → student/approved result snapshot | Scores within configured ranges; versioned grading scales; release authority; no student-editable grades; transcript immutable snapshots and issue audit. |
| Finance | fee_structures → programme/intake/currency; invoices → student/applicant; invoice_items; payment_attempts; payments; payment_allocations; refunds; adjustments; receipts | Unique provider charge/event/reference/idempotency keys; matching invoice currency; non-negative amounts; approved adjustments; transactional balances; no totals across currencies. |
| Scholarships | scholarships; scholarship_applications → applicant/student; scholarship_awards → approved review/invoice allocation; sponsors; sponsorships | Approved eligibility and value limits; no self-approval; explicit named-student disclosure consent; private applicant financial evidence. |
| Awards | certificates → student/programme/completion approval; certificate_versions; certificate_verifications; revocations | Unique award serial and unguessable verification token; eligibility plus authorization; immutable issue snapshot; minimum public data and revocation status. |
| Library | library_resources; resource_rights; resource_files; categories; access_entitlements | Owner/licence evidence; allowed download/access audience; private objects; expiry/takedown status; category/search indexes. |
| Communications | announcements; messages/conversations; notifications; delivery_outbox; delivery_attempts; consent_preferences | Recipient scoping; durable deduplication; no private content in analytics; opt-in/out and purpose limits; scheduled/failed indexes. |
| Configuration/locales | institution_settings; translations; document_templates; grading_scales; admissions_policies | Versioned settings; approved publication; locale fallback; no secret values; templates cannot silently alter an issued record. |

All tables require creation/update timestamps, validated status transitions and explicit deletion/retention behavior. Choose UUID identifiers for private records, restrictive foreign keys for academic/payment evidence, and archival rather than cascading deletion of issued/settled records. Add indexes for every foreign key used by authorization queries. Use database transactions/RPCs for multi-row invariants rather than hoping that several REST calls succeed together.

## Authorization matrix

| Role | Allowed scope | Explicit exclusions |
| --- | --- | --- |
| Super Administrator | Institution settings and audited role management | No silent erasure of payment/award/audit evidence; emergency access logged. |
| Seminary President | Institutional oversight and designated release/award approvals | Must not bypass documented eligibility checks or alter payment-provider verification. |
| Academic Registrar | Enrollment, registration, academic records and result release as assigned | Cannot change verified payment evidence or issue awards alone when dual approval is required. |
| Admission Officer | Assigned applicant files and admission review stages | No tuition settlement, unrestricted grades or role grants. |
| Finance Officer | Fees, invoices, allocations, approved financial adjustments and reconciliation | No grading, answer keys or unrestricted pastoral/student notes. |
| Dean | Assigned school, its staff, curriculum and authorized reviews | No access to other schools without an additional grant. |
| Head of Department | Assigned department, course oversight and authorized academic reviews | No institution-wide privilege by title alone. |
| Lecturer | Assigned course offerings, enrolled students, submissions and grading | No other lecturer's course or student finances; no self-granting assignments. |
| Student | Own applications/profile, enrollment, entitled content and released records | No peer documents, unreleased grades, question keys or fee overrides. |
| Certificate Verifier | Minimal issued/revoked award response for a known token | No student directory, transcript, passport or account access. |
| Applicant (supporting lifecycle role) | Own draft/submitted application, required documents and verified invoice status | No enrolled content until institutional enrollment. |

Role assignments are server-controlled records. Do not authorize from user-editable Auth metadata. Keep institution/school/department/course scope explicit. Existing ministry `devotional_editor`, `event_editor` or meeting-host flags do not create CRISM roles. Bootstrap owner authority through a separately approved, audited procedure; do not create a publicly callable privilege-granting RPC.

## State transition controls

- Application: draft → submitted / payment pending → under review → awaiting documents / approved / rejected. Conditional requirements belong to the offer record. Approved → admitted → enrolled only after acceptance/identity and configured academic/financial conditions. Review decisions remain human, recorded with actor, reason, time and revision.
- Lessons: draft → reviewed → published; published content uses versions. Student progress references the entitled version. Archived content remains reproducible for academic records.
- Exam: draft → scheduled → available → closed. Attempt: started → autosaved → submitted/expired → graded → reviewed → released. Deadline and extension checks run on the server. Expiry cannot depend on an in-memory Render timer.
- Payment attempt: prepared → provider pending → verified successful / verified failed / unresolved. Unresolved requests cannot create duplicate charges. Refund/reversal events update ledger state, not historical receipts silently.
- Award: eligibility reviewed → approved → issued → revoked/replaced. Public verification reflects revocation without exposing private records. The design must not equate a generated PDF with an approved qualification.

## API boundaries

Public `/api/crism`: institution information, published/proposed catalogue with explicit status, approved faculty/calendar/library projections, known-token certificate verification. No raw public table browser grants are required.

Applicant/student `/api/crism/me`: verified identity and owned records. Query identities from the session, not a client-supplied user ID. Enrollment checks are mandatory for every material, class, forum, assessment and result.

Staff `/api/crism/admin` and lecturer `/api/crism/teaching`: capability checks on every mutation and read, including exports and file downloads. Database service-role access does not replace these checks. Use optimistic revisions for competing editors/reviewers and database transactions for approvals.

Shared Flutterwave webhook: validate signature first, retrieve charge, dispatch by validated reference domain to store/donation/academic handlers, then compare immutable ledger expectations. Never let an arbitrary reference direct a database query to an untrusted table or URL.

## Operational design

Store UTC timestamps and IANA display zones; default academic administration to Africa/Lagos. Store date-only dates separately. Use ISO currency codes, audited rounding/minor units and server fee snapshots. Keep application/session/programme identifiers independent of names and slugs.

Use a durable outbox for notifications, award generation and payment reconciliation. A future worker/scheduler must be chosen and costed; Render Free processes cannot reliably finish jobs after spin-down. Read-time expiry checks remain authoritative even when notification jobs are delayed. Host videos externally through approved institution accounts; material ownership and private-link access must be documented.

Internationalization needs UI dictionaries and versioned translated academic content in English, French, Dutch, Yoruba, Igbo and Hausa. Do not label machine translation as an approved curriculum. Start with an English fallback and add reviewed language content; do not display nonfunctional language selectors.

## Delivery slices within the ten requested phases

1. Public identity foundation: original academic SVG crest, isolated navy/gold shell, homepage/about/vision/president, proposed schools/programmes, admissions information and contact handoff. No invented staff, fees, dates, admissions approvals or accreditation.
2. Institution configuration and catalogue admin: migrations, roles and scoped editorial permissions, six schools and proposed programme records with an audited publishing workflow. Establish real applicant auth before opening applications.
3. Applicant-to-student vertical slice: account → application → private documents → human review → offer → enrollment, with status tracking and safe failure recovery. Notifications only after sender setup.
4. Student/lecturer learning slice: enrollment → course registration → published lesson → progress → assignment → lecturer feedback. This must work end-to-end before broadening the LMS menu.
5. Academic assessment slice: secure exam attempts → autosave/submission → grading → registrar release → transcript snapshot.
6. Academic finance slice: approved fee schedule → invoice → one provider attempt → verified settlement → allocation/receipt; scholarships, adjustments and sponsor reports follow the same ledger controls.
7. Completion/award slice: configured graduation requirements → human eligibility review → authorized issue → QR verification → revocation/replacement.
8. Library/languages/AI: licensed resources and locale content, then a separately limited study assistant with checked references and no assessment answer leakage.
9. Operational readiness: backup restore, timed-exam interruption recovery, access revocation, file scanning/retention, payment reconciliation, device/accessibility/low-bandwidth checks and concurrency testing.

## Master brief coverage / release gates

| Brief area | Delivery ownership | Evidence needed before calling it complete |
| --- | --- | --- |
| Branding and official documents | Phase 2, then Phase 8 templates | Configurable identity; approved crest; rendered letter/ID/transcript/certificate templates; no fabricated signature. |
| Public institution and six schools | Phases 2–3 | Working routes, catalogue search/details and honest programme availability. |
| Admissions/student lifecycle | Phases 3–4 | Real multi-user application/review/enrollment workflow and permission tests. |
| Student and lecturer portals | Phase 4 | Real scoped dashboard data and working actions; no placeholder modules presented as live. |
| LMS/materials/video/live classes | Phase 5 | Entitled content, upload/download rights, saved progress and provider/time-zone tests. |
| Assignments/exams/results/transcripts | Phase 6 | Server timing, attempt replay/expiry, deterministic/manual grading and audited release tests. |
| Tuition/scholarships/sponsors | Phase 7 | Invoice/charge/receipt reconciliation; duplicate webhook and refund tests; distinct donation ledger. |
| Awards/verification | Phase 8 | Human-approved eligibility, issue snapshot, public minimal verification and revocation tests. |
| Digital library | Phase 9 | Licensed resource evidence, search, rights-controlled reading/download. |
| Bible AI | Phase 9 | Real provider test; privacy/source/assessment controls; supported model and quota. |
| Six languages/global use | Phase 9 | Reviewed translations, locale fallback, international phones/time zones/currency checks. |
| Reports and exports | Each domain, consolidated Phase 10 | Authorized PDF/Excel exports with spreadsheet-formula injection protection and no unrelated records. |
| Security/scale/deployment | Every phase; Phase 10 release | Regression + multi-user tests, restored backup rehearsal, measured concurrency, documented cost and owner launch rehearsal. |

## Immediate implementation boundaries

The assessment/public foundation must not mutate existing church data or create real student/payment records. Programme names from the brief are proposals, not approval to invent course credits, dates or fees. The campus launch should not advertise operational portals, instant admission, recognized degrees, verified certificates or automated lectures until their real workflows and approvals exist.

Public pages can be developed while institutional policy/content is confirmed. Real applications, tuition collection, role bootstrap and qualification release need the corresponding decisions listed in the assessment. No paid service will be added to work around a free-tier limitation without approval.
