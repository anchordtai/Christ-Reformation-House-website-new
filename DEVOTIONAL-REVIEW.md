# Daily devotional reader and editorial desk

The existing devotional page repeats one sample for every selected date. This change replaces it with database-backed readings and a protected editorial desk, while preserving the ministry's React/Vite and Express deployment.

Programme: 1 November 2026–31 October 2027. November's 30 manuscripts and the 365-day outline are saved in the separate private review package. They are deliberately absent from this public repository, browser bundle and deployment assets. The remaining 335 days are outlines, not completed devotionals.

## Reader

- `/devotional` selects today's Africa/Lagos date; `/devotional/YYYY-MM-DD` gives a shareable dated reading.
- Only reviewed published/scheduled entries whose release time and reading date have arrived are returned. Drafts, early releases and unreviewed rows are excluded in both the query and server response filter.
- All supplied devotional sections render as escaped text. The archive searches released titles, themes and references. Sharing uses the native share dialog or copies the dated link. Print styles hide navigation and controls.
- Empty dates and service failures show distinct states. No repeated sample or invented fallback is used.

## Editorial desk

`/admin/devotionals` uses a separate Supabase Auth sign-in and tab-scoped token. Every protected request checks the user with Supabase Auth and reads authoritative `app_metadata`, requiring `role: admin` or `devotional_editor: true`. User-editable metadata and browser role flags never authorize backend access. Tokens expire normally; sign in again when prompted. The scoped login endpoint has a bounded per-process rate limit in addition to provider limits.

The editor supports insert-only JSON imports (1–31 entries at a time), individual editing, full reading preview, private drafts, withdrawal to draft, reviewed scheduling and immediate publication. Imports skip existing dates and always force draft status. They are sequential, not an all-or-nothing batch: an error reports how many entries were saved, and retry skips those dates. Revision conditions reject stale saves across tabs/editors. A conflicting save retains the unsaved form for copying; reload the list and reopen the entry before reconciling.

Release requires explicit pastoral acknowledgement on the current form. Editing clears the acknowledgement. Release timestamps include an offset; calendar rules use Africa/Lagos. Selecting published with a future reading/release is rejected. Every saved draft clears its review and release fields, withdrawing an earlier public version if one existed. All required devotional sections must be complete even when saving a draft.

## Activation remaining — not executed

1. Restore this connection's authorized access to church Supabase project `yaicqepqhpskcoqcvoqf`. The read-only inspection on 30 October 2026 still returned permission denied.
2. Inspect the existing schema and security advisors in that project. Review `database/devotional-setup.sql`; it is a prepared setup script, not an applied migration. It creates a new table without touching donations or other records. RLS is enabled and public/anon/authenticated access is revoked. Only the server's service role receives table access. There are no public policies or security-definer functions. Confirm REST/Data API exposure for the server role using the project's current settings.
3. Provision the intended real editor account and set its `app_metadata` through an authorized admin channel. Do not assign editor access from a sign-up form, `user_metadata`, or an email guess.
4. Use the existing backend-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Never put the service role key in a Vite/frontend variable. Existing frontend API routing is retained.
5. Deploy this feature through the existing review process, then sign in to the desk and import `november-2026.drafts.json` from the private review ZIP. No manuscript publication is authorized by an import.
6. Review content pastorally, including quotation accuracy, context and interpretation. Release only approved entries at their chosen times. Perform live editor login/import/reload, anonymous draft-denial and release-boundary checks in the correct project before relying on it publicly.

## Validation and limits

Local checks: backend permission, visibility, calendar, validation, stale-save and outage tests; rendered frontend format, text escaping, archive filtering, empty/error states and unauthenticated editor checks; all existing payment and frontend regressions; Vite production build. All 30 private November manuscripts also pass the new import validator.

No live database setup, editor role assignment, draft import, merge or production deployment has occurred. Real browser responsive/print/native-share checks and end-to-end Supabase tests remain pending. Automated DOM checks do not establish visual layout or real authentication success. The previous workspace implementation was unavailable; this branch reconstructs it from the saved requirements and private manuscript schema.
