# UNLEASH THE SUPERNATURAL — December 2026

## Publication and content
The permanent publication name is unchanged. December’s focus is **Christ Among Us: Life in the Spirit, Light for the World**. The existing November edition, site navigation, accounts, meetings, donations, forms and communications are preserved.

The delivery contains 31 English manuscripts, with 501–570 words in each main teaching and all required sections. The calendar has 31 unique titles and correct dates. Primary and memory quotations match the existing local KJV files; the editorial report checks 422 Bible-reference occurrences. Automated editorial inspection is not human pastoral approval.

Each priority language—Yoruba, Igbo, Hausa and French—has 31 complete draft records. They are **in progress**, not reviewed, approved or published. Local machine translation produced semantic and negation errors that require substantive fluent-language and theological correction. Matching fields or sentence counts does not establish accurate meaning. See `publication/2026-12/TRANSLATION-STATUS.md` and the provisional glossary.

## Use the existing editorial desk
Open `/admin/devotionals` and sign in with a confirmed editorial or administrator account.

1. Open a December English entry in the existing list. Edit its individual sections and use **Preview devotional**.
2. Save **Under review** while reviewing. **Approved** records pastoral approval but remains private. **Scheduled** requires a release time and explicit pastoral-review acknowledgement. **Published** is allowed only once the reading’s date and release time arrive. **Archived** withdraws it.
3. For midnight release in Nigeria, use 00:00 WAT on each entry’s own date; that is 23:00 UTC on the preceding date. Nothing in this batch schedules unapproved content.
4. Use **Publication & language desk** for monthly editions, progress reports, cover asset paths, review PDFs and JSON/CSV exports.
5. Correct a translation in its section-based editor or import a complete language draft JSON array. Existing imported translations are skipped. Saving text clears previous review approvals and returns the record to **in progress**.
6. Advance each saved translation in order: **completed → language reviewed → theological reviewed → approved → published**. Each review requires acknowledgement of work actually completed by a competent reviewer. A machine-generated record must not be advanced merely because all its fields exist.
7. A public translation requires a released English parent, a matching English revision, published translation status and all review acknowledgements. English revision changes conservatively invalidate older translations, including status-only changes. Schedule English before the final translation review pass.
8. Monthly metadata uses draft, announced, published and archived states. Announcing an edition does not release its daily content. Ordinary future editions and readings can be created through the existing forms without rebuilding the site.

## Reader experience
The reader retains Scripture links, donations, moderated comments and likes, subscriptions, full-text search, sharing, printing, bookmarks, marked-read dates and optional local reading history. Added features include monthly/yearly edition selection, a released-day calendar, previous/next dated navigation, language selection that preserves the date, explicit English fallback, Scripture copying and daily/monthly PDFs.

Version 2 entries show every section with localized labels. Arabic and Hebrew use right-to-left website layout when available. Those additional manuscripts are not included; professionally shaped RTL PDFs remain unavailable. Browser bookmarks and history do not sync across accounts or devices.

Optional analytics count aggregate reading opens, not unique readers or completed readings. The dashboard labels those limits. No reading history or account identifier is sent by the open-count feature.

## PDFs and visual assets
The English review PDF includes the cover, publication information, table of contents with page numbers, all 31 entries and page footers. It is marked **Editorial review copy**. Staff can generate language review PDFs from saved drafts; public downloads require complete reviewed and released content. A full monthly PDF cannot reveal future or unreleased readings. Individual released readings can be downloaded or printed.

The cover uses approved CRH branding with the generated December artwork. Thirty-one editable SVG social graphics are included. Public PNG artwork is generated only for released readings. No social-media post is automatically sent by this delivery. Publication cover selection currently uses an existing asset path; an arbitrary binary asset-upload library is not included.

## Database, security and cost
The migration extends the existing devotional table’s date and lifecycle constraints. It adds edition metadata, linked translations, editorial audit records and aggregate engagement. All new tables have RLS and no anonymous/authenticated table access; public reads and staff writes pass through the existing Express API. Staff permissions use freshly verified Auth `app_metadata`. Optimistic revisions prevent accidental overwrite. Important writes create audit records without copying manuscript bodies into the audit log.

The 31 English entries and 124 translation records were imported insert-only. Existing dates were not overwritten. All 30 November content hashes matched the pre-import baseline. No reviewer or publication approval was fabricated.

No new Supabase project, paid API, hosting upgrade, billing activation or payment method was introduced. Existing free-tier allowances still apply. Translation models ran as temporary editorial tools, not as an always-on production service. PDFKit is pinned; bundled DejaVu fonts retain their licence. No credentials are included in source or frontend bundles.

## Private review artifacts
- `publication/2026-12/editorial-calendar.csv`
- `publication/2026-12/english-manuscript.json` — compatible with the existing draft importer
- `publication/2026-12/english-import.csv` — complete `content_json` records
- `publication/2026-12/english-manuscript.md`
- `publication/2026-12/translations/{yo,ig,ha,fr}/manuscript-draft.json`
- `publication/2026-12/glossary.json`
- `publication/2026-12/english-editorial-review.md`
- `output/pdf/Unleash-the-Supernatural-December-2026-English-Review.pdf`
- `tools/publication/build-december.cjs` — regenerates English exports, graphic drafts and the review PDF

The unpublished manuscript and translation directories, review PDF and editorial pack are deliberately excluded from the public Git repository. They are saved as private review deliverables and remain in the church database. Restore the editorial package into the ignored `publication/` and `output/` paths only when you need to regenerate or validate those files locally. Public CI runs platform tests without those private inputs; the two content-batch checks are performed locally against the review package.

## Deployment and acceptance
The tracked migration is `20261125141242_devotional_editions_translations.sql`. Production uses the existing Vercel frontend, Render backend and church Supabase project. On a code rollback, retain the additive database structures and draft records; do not run a destructive migration downgrade. Resolve issues with a forward fix.

Pastoral English approval and fluent-language/theological review are outstanding acceptance requirements. Additional languages are supported by the catalogue but are not translated in this delivery. Physical Android, iPhone and Safari testing is not claimed. Automated tests, PDF inspection, responsive styling and the recorded desktop browser checks define the verified scope. Final deployment and test results are recorded in the completion tracker.
