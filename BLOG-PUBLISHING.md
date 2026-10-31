# CRH Journal operating guide

## Owner workflow

After the blog PR is merged and both frontend and API deployments are live:

1. Open `/admin/blog` and sign in with the existing confirmed editorial account. Server authorization uses only trusted `app_metadata`: admin, devotional editor or event editor. No new staff grants are created.
2. Create an article with a real author, category, introduction and body. Save a private draft. Its article link is fixed after first save.
3. Upload a still JPEG/PNG/WebP image (5 MB and 16 megapixels maximum), describe it for accessibility, then save. The server decodes, rotates, resizes to at most 1600×1600 and converts to WebP without EXIF metadata. SVG and animated uploads are rejected.
4. Preview. For release, select Publish now or Scheduled, enter the future date/time in **Africa/Lagos (UTC+1)**, and check the review acknowledgment. Every subsequent edit clears that acknowledgment.
5. The public `/blog` journal and detail pages return only reviewed articles whose publication time has arrived. A request-time database filter makes scheduled posts available without a paid cron service. An already-open page must refresh to fetch newly released posts. There is no social auto-posting added by this feature.
6. Use Comment moderation to approve/reject/return comments for review. Comments start pending; only approved comments are public. Withdrawing an article to Draft hides its public page and prevents new interactions. Likes and comments remain for future review.

Drafts are server-persisted only on Save. Unsaved content is not placed in browser storage. Switching articles warns about unsaved changes; leaving/reloading warns through the browser where supported. Do not sign out with unsaved work. Revision comparisons prevent overwriting another staff session. After an uncertain save, reload the list before changing the article again.

## Reader features

Full-text search, category filters and pagination use real database content. Empty and unavailable states never invent articles. Article bodies and comments render as text (including any supplied HTML). Paragraph breaks are preserved. Reader interactions include likes, moderated comments, WhatsApp/Facebook/X, native sharing where supported, link copying and cover download for manual Instagram uploads. Instagram has no generic web link-sharing endpoint, so no automatic Instagram post is claimed.

A random browser identifier is created only when a reader submits a like or comment and stored under `crhBlogReaderV1`; the server stores a blog-specific SHA-256 hash. Like preferences are browser-local and not verified personal identities; clearing storage or using another device can create another reader identity. This is abuse reduction, not a one-person voting system. Comments require consent to public display of an alias and text, with no email collection. Readers should send private matters through the contact/support channels.

Cloudflare uses the existing site/secret keys, with exact `blog_like` and `blog_comment` actions and church hostname validation. Write limits and a honeypot supplement this check; no automatic AI ban or doctrinal moderation is enabled. Process-local limits reset on restarts and are shared behind proxies. Bot checks restrict writes; normal reading and legitimate social crawlers remain accessible.

## Database and images

`backend/sql/blog.sql` records the two applied additive schema changes. All five blog tables have RLS enabled and no anon/authenticated grants. RPCs are invoker functions executable by service_role only, with fixed search paths. Interactions lock/check the reviewed release condition inside the transaction; duplicate likes and exact comment retries are idempotent. All API/staff errors omit provider details and secrets. Staff POST operations enter the existing security audit.

The `crh-blog-media` bucket is created privately by the backend on the first authorized upload, using its existing server-only Supabase credentials. No public bucket or browser storage policy is created. A public image URL is served only while a released article uses that image. Staff preview fetches authenticated blobs without putting tokens into URLs; object URLs are revoked when replaced/unmounted. Supabase Storage write/download errors fail closed. Image writes use immutable UUID paths and check content hashes on retry; uncertain uploads are not overwritten.

Uploads use storage quota. Unattached private images can remain after abandoning a draft or replacing a cover, especially after interrupted metadata writes; periodically review orphan objects in Supabase Storage. Do not bulk delete referenced objects. Published images have a 5-minute browser cache, and copies already shared externally cannot be recalled. No paid storage or image transformation service is provisioned. API transforms run one at a time to bound memory on free Render.

## Social previews

Vercel conditionally rewrites common social crawler requests for `/blog/:slug` to the API's server-rendered metadata/article HTML. Title, introduction, canonical URL and cover are escaped and checked for current release eligibility. Normal browser requests retain the SPA route. The conditional rewrite must be checked after deployment (Vercel does not fully emulate header matching locally). There is no crawler exemption from the database release filter. The generic Netlify preview continues to use the SPA metadata; production is Vercel.

## Optional AI assistance — inactive until configured

No provider credentials have been added and no live AI requests were made. Manual publishing works independently.

The adult staff assistant supports drafting from a public brief, improving supplied wording and generating title/introduction/tag suggestions. Suggestions are returned separately and applied to an unsaved draft only after an explicit staff action. They cannot publish, approve or schedule anything. Pastoral review and Bible-reference verification remain mandatory. No contact, chat, prayer, payment or other database records are fetched for AI context.

To activate on the Render API, the owner must choose a current Gemini model with free-tier support in a project **without paid billing**, review Google's terms/data handling, then configure server-only:

- `GEMINI_API_KEY`
- `BLOG_AI_MODEL` (current supported text model ID; no obsolete hardcoded default)
- `BLOG_AI_ENABLED=true`

Do not paste the key into chat, source or Vercel browser variables. The plugin search did not expose an AI Studio credential-management tool. Configure secrets in Render. Free-tier availability can vary; application rate caps are not a financial hard limit for a project with billing enabled. Keep paid billing disabled to honor the no-spend requirement.

Every request requires consent, staff authorization, bounded public input and an atomic persistent cap of 10 attempts per staff member per Lagos day. Failed/blocked calls consume an attempt to prevent retry loops. Requests use a fixed Google endpoint, no tools/URL fetching, no automatic retries, bounded output, structured JSON validation and a 45-second provider timeout. Missing configuration, quota exhaustion, blocked or malformed output leaves the saved article unchanged. Free-tier submissions may be used by Google to improve products; editors must not enter private material. Set `BLOG_AI_ENABLED=false` to switch it off.

References checked during implementation:
- https://supabase.com/docs/reference/javascript/file-buckets-createbucket
- https://supabase.com/docs/reference/javascript/file-buckets-download
- https://sharp.pixelplumbing.com/api-constructor/
- https://ai.google.dev/api/generate-content
- https://ai.google.dev/gemini-api/terms
- https://vercel.com/docs/project-configuration/vercel-json

## Validation and release

The rollback SQL `backend/test/blog.rollback.sql` verifies real database interaction locking, future/withdrawn restrictions, idempotent likes/comments, pending moderation, private grants and AI quota. No fixtures survive the rollback. 105 frontend tests and 140 backend tests (245 total) pass. Automated frontend/API tests cover read/schedule gates, staff role rejection, conflicts, bot actions, escaping, image conversion, AI configuration/quota/privacy gates and reader/editor behavior.

Before frontend rollout, ensure Render has deployed the same commit. Then verify `/api/blog` (honest empty state until a real article is published), unauthorized desk routes (401), owner draft/image preview, publish/retract and social crawler metadata. Live Turnstile completion and real AI output need owner/provider validation on the church domain. Do not bypass the bot challenge or publish synthetic test articles on the live site.

Frontend runtime dependencies and backend dependencies have zero reported audit findings after the routing/build dependency updates. Eleven moderate findings remain in existing development-only ESLint tooling; no high/critical findings remain. The app uses React Router 7.18.5, Vite 8.3.5, plugin-react 6.1.2 and esbuild 0.28.2. Node >=22.12 is required; existing hosting uses Node24. The Vite config is now `.mjs`. Staff pages and journal routes load on demand to reduce the initial bundle. Tailwind remains v3: the open v4 upgrade is a separate CSS migration, not a safe automatic bump.
