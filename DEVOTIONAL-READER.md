# Devotional reader: search and personal reading space

## Reader features

The existing `/devotional` and dated reader now include:

- Ranked full-text search over released titles, themes, central truths, message text, key lessons, applications and main/memory/supporting Bible references. English stemming lets related forms such as “forgiving” and “forgiveness” match. Quoted phrases are supported. This is PostgreSQL full-text search, not generative AI or semantic/embedding search.
- Monthly-theme filtering, safe highlighted excerpts and twelve results per archive page. Full scripture names such as `John 3:16` and `John3:16` are supported. Reference boundaries distinguish John from 1 John and verse 1 from verse 16. This is textual reference matching; it does not interpret every possible abbreviation or determine whether a verse lies inside a referenced range.
- Save/unsave readings and an explicit Mark as read/Undo action. Opening a reading does not mark it finished.
- Recently opened readings only after opting into “Remember readings I open on this device”. History is capped at 60 unique dates; disabling it clears the recent list. Bookmarks and marked-read dates are independent of that setting.
- All/Saved/Marked read/Recently opened archive views. The same server search and theme filter apply to these views.
- Clear my reading data with a confirmation. This affects only the dedicated reading-library key, not staff sessions, likes, chat access or Store checkout data.

## Privacy and persistence

`crhDevotionalLibraryV1` stores only programme dates, a version and the history preference in that browser's localStorage. It stores no titles, manuscript text, contact details, account identifiers or timestamps. The data is not sent with API requests and does not sync across accounts/devices. Browser/private-mode storage limitations can prevent persistence; the reader shows a visible warning and keeps changes in the current tab when possible. Clearing browser data or using a different browser/device loses the saved reading space. Clearing local preferences cannot be undone.

Only currently released entries returned by the server appear in the reading lists. A previously saved date remains locally until removed/cleared if its reading is withdrawn, but a withdrawn title/manuscript is not saved in the library. There is no offline manuscript cache.

## Search API and database

New `GET /api/devotionals/archive?q=&theme=` accepts a query up to 120 characters and a theme up to 160. It returns at most 366 small result summaries plus currently released monthly themes. The dated reading still uses the existing API for its full manuscript. This removes the reader's former download of every full released manuscript just to render the archive. The original public/editor APIs and publication/review process are unchanged.

`backend/devotional-archive-schema.sql` defines a weighted immutable vector function, partial GIN index, and server-only invoker-security search RPC. It requires published/scheduled status, reviewer identity/time, elapsed release time and a publication date that has arrived in Africa/Lagos. Draft, future-date and delayed-release themes are excluded as well as their readings. Result summaries omit full manuscripts and staff/audit fields. Excerpt markers are rendered as React text/mark nodes, never source HTML.

The search RPC's optional `p_at` clock supports controlled database rollback tests. Its EXECUTE privilege is revoked from PUBLIC, anon and authenticated. The HTTP API passes only `p_query` and `p_theme`, never caller-supplied clocks/statuses. Normal requests always use the database's current time. Both new functions have fixed search paths and service-only grants. Existing table RLS and grants are unchanged.

The schema was applied to the approved CRH project; the reference-boundary refinement was then applied as a replacement search function. If changing the immutable vector function in future, rebuild its expression index so existing lexemes remain consistent. The existing Supabase advisor baseline remains: intentionally server-only RLS tables, public donation_types metadata visibility and disabled leaked-password protection. This change adds no new advisor findings.

Search is debounced and bounded; malformed/repeated parameters fail before database calls. Errors are reported independently of the currently selected reading instead of pretending the archive is empty. Request limits are process-local and supplement the existing deployment's controls. No search data is sent to an AI service.

## Verification

95 frontend tests and 125 backend tests pass, including date/storage validation, corrupt/quota-denied storage, independent/reversible save/read actions, opt-in history, withheld-reading filtering, safe excerpts, API input validation and ignored caller clock/status fields. The production build passes. Actual database rollback tests checked stemming, relevance ranking, phrase matching, Bible-reference boundaries, hidden themes, private-field omission and Nigeria release timing. Fixture writes were rolled back; no devotional was released early.

On 31 October 2026 the programme has not begun, so a public empty archive is expected until the first scheduled reading is released. Hosted previews use the existing production backend CORS policy, so archive requests on an unapproved preview origin can show a connection error; that does not widen production access. A live frontend-to-new-API smoke check follows owner-approved deployment.

## Deployment and rollback

Merge the approved PR to main for the existing Vercel/Render deployments. No new environment variables, provider account, paid service, email/social message, AI integration, authentication setting or payment configuration is required.

Rollback by reverting the application PR. The previous reader can operate with the additive search functions/index left in place. Do not delete devotional content or alter release schedules to roll back this feature. Personal reading data is local to each browser and is unaffected by an application rollback.
