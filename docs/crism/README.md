# CRISM delivery status

## Delivered in this branch

- Phase 1: source/live-infrastructure assessment, security findings, payment integration boundary, logical data domains, role matrix, launch gates and ten-phase roadmap.
- First public slice of Phase 2: independent academic shell, original reusable SVG crest, homepage and institutional information, six school detail pages, 21 proposed programmes with search/school/type filters, programme details, truthful admissions/fee/faculty/library/calendar/news availability pages and contact handoff to the real ministry enquiry form.
- Church navigation links to CRISM. Existing church routes retain their own header, footer, ministry guide and November campaign; the academic section uses its own shell.

## Intentionally not represented as operational

There is no CRISM applicant account flow, student/lecturer/admin portal, institution role provisioning, catalogue CMS, application database, tuition ledger, course enrollment, LMS, examination engine, grading, scholarship decision system, certificate issuance, library distribution, translated curriculum or student AI endpoint in this public foundation.

The proposed catalogue is source-controlled configuration from the owner's brief (`src/crism/catalogue.js`), not a database-backed academic administration system. Schools, departments and programmes become staff-configurable only in the later catalogue/role implementation. Application links and payment buttons are not displayed as if those workflows existed.

No new live database objects, roles, grants, storage buckets, paid services or production application changes were created by this branch. Full release still requires the repository's normal approval. Domain ideas from the brief have not been purchased or checked for availability.

## Documents

1. [Technical assessment](01-technical-assessment.md)
2. [Architecture, roles and delivery register](02-architecture-and-delivery.md)

## Local verification

- Frontend suite: 127 tests passed, including 10 CRISM tests.
- Backend suite: 151 tests passed; backend code is unchanged.
- Production build passed.
- Browser QA: desktop homepage, real catalogue search, 390px mobile menu and layout; observed content widths do not exceed the relevant viewports.
- Preview is internal review. It is not an operational institution launch or proof of capacity for thousands of concurrent students.

Next vertical slice: versioned CRISM schema, deny-by-default institution roles, catalogue administration and applicant identity foundation. Confirm approved admissions/fee/governance decisions before collecting real student documents or money. Preserve existing ministry permissions and payment verification throughout.
