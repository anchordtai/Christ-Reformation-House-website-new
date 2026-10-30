# Devotional sharing and reader responses

Readers of a released devotional can share its canonical dated link through WhatsApp, Facebook, native sharing or copy/paste. Instagram has an explicit caption-and-verse-card workflow: download a 1080px square KJV memory-verse image, copy the caption, and publish through Instagram themselves. No account is connected, no social SDK is loaded, and nothing is automatically posted. Platform login, device share targets and external posting remain under the reader's control. Social crawlers may use the site's existing generic metadata; per-reading server-rendered Open Graph previews are not included.

A giving panel opens the existing `/donate` checkout, including its configured currencies and payment methods. The devotional never starts or confirms a payment itself, and the payment implementation is unchanged.

Likes use a random 256-bit browser identifier stored locally; only its SHA-256 hash is saved by the server. A unique reading/date + identifier key prevents duplicate likes from retries. Setting/unsetting a like is idempotent. This represents browsers, not verified people: clearing storage or using a different browser can produce another like. No fingerprint, email or social account is collected.

Comments are guest reflections with a public display name, a 2,000-character limit and explicit publication consent. All submissions enter `pending` status regardless of client fields. Names and comments render as text, never HTML. Network retries reuse a submission UUID and are deduplicated by a database constraint. The client retains entered text on failed submission. Public responses contain only approved comments and omit identifiers, moderation details and rejected/pending content. Visitors should keep private or sensitive information out of public reflections.

The editorial desk includes a collapsible comment moderation queue with pending, approved and hidden filters. An authoritative Supabase user lookup and existing editor role check protect every moderation request. Editors can approve, hide, or restore comments. Status-conditional updates reject stale reviews, and lists are paginated.

All public community reads/writes first verify that the devotional is reviewed and its date/release time has arrived. Editorial previews show disabled action examples without calling public community endpoints or sharing private text. Sharing and giving remain usable if browser storage is unavailable; likes/comments explain their storage requirement.

## Database and security

`database/devotional-community-setup.sql` was applied to church Supabase project `yaicqepqhpskcoqcvoqf` as migration `add_devotional_reader_community`. Two new tables store likes and comments; existing devotional manuscripts, release dates, editor permissions and donations are untouched. RLS is enabled, public/anonymous/authenticated table privileges are revoked, and only the backend service role receives the minimum required privileges. No public policies or security-definer functions are created. The expected informational 'RLS enabled, no policy' advisory reflects this intentional server-only design.

All responses are no-store. Browser identifiers are sent in a request header, never URLs. CORS explicitly allows that header. Write limits are bounded by browser identifier and request IP, with no IP retained in database rows. Limits are in-process and supplement guest comment moderation; they reset on deploy/restart and do not provide distributed bot protection. No assertion of verified commenter identity or unique-human like counts is made.

## Verification

74 backend and 53 rendered frontend tests pass, including existing payment regression coverage, release/privacy gates, duplicate submission/like behavior, consent and length validation, reviewer authorization, stale status conflicts, safe error output, text escaping, retained form content after failure, Instagram/copy/native-share fallbacks, preview privacy and giving navigation. The production build passes. Database role checks confirm that anonymous reads and authenticated direct writes to both new tables are denied.

Full local browser QA was unavailable because the browser could not reach the local test server. Actual WhatsApp/Facebook/Instagram publishing, physical mobile sharing, and verse-card file download still need user/device confirmation. Production scheduled readings remain unavailable before 1 November 2026; no manuscript was published early to test engagement, and no real payment or social post was initiated.
