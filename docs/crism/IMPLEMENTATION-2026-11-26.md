# CRH global platform implementation register

Owner direction, 26 November 2026: implement the five recommended ministry priorities. Prioritise operational CRISM Certificate and Diploma training; degree admissions stay closed pending legal approval. Keep existing hosting, database, content and payment records. No paid resources authorised.

## Delivery order and acceptance

1. School: identity and recovery, separate academic roles; configurable Certificate/Diploma programmes/intakes; applications and human decisions; enrollment; teaching and progress; assignments/examinations; released results; automatic verified-completion awards, PDF and verification. Fees require approved policy and distinct academic ledger. Curriculum, staffing, duration, fees and intake dates requested from owner; do not invent approved decisions.
2. Ministry operations: unified administration navigation, administrator onboarding, first real sermon recording/publication rehearsal and backup restore rehearsal. Real device permissions and recorded media require host participation.
3. Global mission: published projects/locations and private volunteer/partner applications, assigned coordinators and evidence-based progress reports.
4. Member care: confirmed identity, own profile, explicit follow-up requests, assigned care, discipleship progression and fellowship directory. No public disclosure of sensitive pastoral information.
5. Global outreach: language preferences, reviewed content, visitor time zones and existing consented email integration. Official WhatsApp account configuration and live interpretation require separate external setup; do not claim sharing equals automated messaging.

## Evidence register

Database migrations and approved curriculum are applied. Source deployment verification is recorded separately in the delivery response. Existing December releases and PDF credits are preserved.

## Confirmed owner decisions
- All 5 existing Certificate and 7 Diploma programmes included in startup. Certificates: 3 months; Diplomas: 6 months.
- Application: NGN 2,500. Tuition and certification: NGN 20,000, treated as additional to the application fee (NGN 22,500 total).
- Admissions: 10 December 2026 through 10 January 2027 inclusive, Africa/Lagos. Teaching start date is not supplied.
- Academic officer: Pastor Cecilia Taiwo.
- Created in existing Zoho account: admissions@christreformationhouse.org.ng (display name CRISM Admissions), an alias of the existing church mailbox. Zoho visibly confirmed success; no paid seat, separate password or delegated access created. Inbound/outbound external delivery rehearsal remains unperformed.

## Academic approval received
The owner explicitly confirmed “Reviewed and approved as presented” for the 54-page private academic review pack, proposed entry requirements, 50% coursework / 50% examination weighting, 50/100 final pass standard and capacity 50 per programme. This is owner-attested approval, not an assertion of university accreditation or an independent external review. Use this approval for the exact imported programme map and lesson contents; examination/assignment submission dates remain unset drafts until lecturers supply the calendar.

## Implemented and database-published, 26 November
All four tracked migrations applied to the church database only. Twelve approved programmes, 114 programme-course instances and 456 published lesson instances were imported privately (48 distinct authored foundation lessons reused across programmes). Assessment templates remain draft until the academic office sets teaching dates. Twelve intake windows are scheduled; none is accepting applications before 10 December. No student, payment or award was fabricated.

The owner subsequently directed automatic award issuance. The enabled database policy requires two verified school invoices, every required lesson, a released passing grade for each written assignment and each examination, and passing course results computed 50/50. Objective tests auto-grade and release; written work requires lecturer marking and registrar release. Failed attempts persist; three attempts/submissions are allowed per assessment within its window, with audited additional allowances. Revoked awards are not automatically reissued. Human review remains required for replacements. The original school logo is used unaltered in the school site and PDF, with unique serial and QR verification. No university accreditation is claimed.

Global mission, community care, discipleship and unified administrator navigation are implemented with server-only RLS tables and explicitly scoped roles. Public project records are not invented. This does not activate external live interpretation, Windows AI processing, portrait-video production or official WhatsApp delivery. A real sermon recording rehearsal needs the host/device. Teaching start date and class/assessment windows still need the academic officer. Staff invitation UI is provided; Cecilia and the additional ministry administrator must receive/accept invitations before those accounts can be claimed ready.

Validation: 174 root tests and 196 backend tests pass; production build passes. Isolated database tests include payment gates, peer-access rejection, immutable curriculum, timed exams, resubmission, automatic certificate eligibility/idempotence, expired-answer finalization, RLS denial and encrypted 22-table backup/restore. No live financial charge or external student signup email rehearsal has been performed. School mail is an alias; its external inbound/outbound rehearsal is outstanding. Existing Supabase communication cron remains the delivery scheduler; GitHub workflow is a manual fallback.

Recovery: obtain an encrypted academic export in the school super-admin desk and keep its passphrase separately. `tools/crism/restore.cjs` is restricted to an empty recovery database with matching migrations and pre-restored Auth identities. It does not restore Auth passwords, media, or other church data. Never run the restore utility against populated production tables.
