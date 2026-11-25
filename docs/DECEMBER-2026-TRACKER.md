# UNLEASH THE SUPERNATURAL — December 2026

## Audit (25 November 2026)
Repository: anchordtai/Christ-Reformation-House-website-new; baseline main765b53a. Existing React18/Vite frontend, Express5 on existing Renderfreebackend, existing crh-database Supabaseproject. November has30entries (all scheduled, review-gated read-time release), noDecemberrows at audit. Captured per-date Novembercontent hashes before modification. Editorial permissions use freshly verified confirmed Auth users and app_metadata admin/devotional_editor. Existing service-only devotional_entries has RLS; no direct reader access. Its existing constraints limit dates to31October2027 and status draft/scheduled/published.

## Reuse and changes
Reuse reader/editor/login, scripture links/localKJV, archive fulltextRPC, browserlocal bookmarks/completion/opt-inhistory, social sharing, moderatedcomments/likes, donationCTA, subscriber and emailworker. Preserve NovemberJSONfields/layout and allroutes. Add monthlyedition metadata, linked translationrecords and progressive review/audit, currentdate-independent editionarchive/calendar, month daynumbers, version2 fullsection manuscript rendering, translated labels/RTL, language-preservingdate navigation, PDFdownloads and dated daily artwork. Expand dates for2027andlater; retain reviewed releasegates. No newproject orpaidservice.

## Risks and controls
- Englishmachine-assisted editorialmanuscripts needowner/pastoral review; no forgedreviewer identity orunapprovedschedule.
- Yoruba/Igbo/Hausa/French translations require competentlanguage and theologicalreview beforepublicaccess; drafts remainunreleased. No claim native reviewers participated.
- Existing November hash mustmatchafter dataimport; Decemberinsert-only, nooverwriteupserts.
- Resource limits: boundedAPIreads, existingfreehost, noaudio/AIinference server, no paidtranslationAPI.
- Local browserreadingdata doesnot sync. Engagementcounts showreal likes/comments only, neverfabricatedreaderviews.
- Export/downloadgate mustchecklivepublicationstatus; draftPDFonlyauthenticatedstaff; printedpage labeled appropriately.

## Completion tracker
- [x] Read fullownerbrief; confirmed churchprojectidentities.
- [x] Inspect currentrepository,module,Novembercalendar,auth,DBschemaandsecuritybaseline.
- [x] Plan31 distinctDecembertopics andScripturereferences.
- [x] Write31complete500–800wordEnglishteachings andallrequiredsections.
- [x] Verifydates,quotes,sections,wordcounts,Novduplication andeditorial/theologicalwording.
- [x] Preparefourcompletetranslationdrafts andglossary; realreviewremainspending.
- [x] Cover,daygraphics,EnglishPDF,JSON/CSV andpreviewformats.
- [x] Extendexistingreader/editor/DB withmonthlyeditionandtranslationworkflow.
- [x] ImportDecemberwithoutchangingNovember.
 31Englishdrafts and124unreviewedtranslationrecords imported. November30/30contenthashesunchanged.
- [ ] Security,regression,publicationgate,readerandbrowserQA.
- [ ] Merge/deployverifiedchangesandhandover.
- [ ] Owner/pastoral approvalandcompetenttranslationreviews (externalacceptance; nevermarkdonewithoutactualreview).

## Verified checkpoint

- 31 English entries and 124 priority-language draft records are in the existing database.
- November preservation: all 30 content hashes match the pre-change baseline.
- New-table RLS is enabled; anonymous SELECT and ordinary-reader UPDATE privileges are absent.
- Frontend test suite: 163 passed. Backend suite: 182 passed. Production build passed.
- Tests now explicitly disable external network requests and use mocked or loopback services.
- English review PDF: 165 pages, with a cover, contents and page numbers; rendered pages inspected.
- Translation sections and date/reference alignment pass structural checks. Language and pastoral approvals remain outstanding.
- Deployment verification is pending below.
