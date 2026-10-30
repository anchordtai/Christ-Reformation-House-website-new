# Meetings and events

## Current meeting connection

The existing public `meet.jit.si` launch remains available until the church connects JaaS. Production embedding of the public service is not a supported solution: https://jitsi.org/jaas/ and https://jitsi.org/api/. The public host authentication requirement belongs to Jitsi and cannot be removed by frontend code.

The room now supports the JaaS IFrame API, inside the church site, after configuration. Its parent uses `parentNode` (the previous unused embed incorrectly used `parent`). It loads only on an explicit join, starts audio/video muted, retains the prejoin device check, reports actual join events, handles load errors, and disposes the SDK/media on leaving or navigation. A pasted public Jitsi link retains its provider, rather than silently sending the guest into a different JaaS call.

Guests enter their name without a church or Jitsi account. Hosts sign in with a confirmed, authorized Supabase account. Host sessions live in sessionStorage in that tab and refresh through Supabase; no passwords are saved. Closing the tab or signing out requires another login. Host privileges are verified on the server from app_metadata or the explicit server user-ID allowlist. Client role flags and user_metadata cannot grant host privileges. Meeting JWTs use RS256, expire after one hour, cover one exact room, and disable recording, transcription, livestreaming and outbound calling by default. The browser never receives the private signing key. The current implementation does not rotate a running conference's JWT; a reconnect after token expiry requires leaving and rejoining to obtain a fresh token.

### Activate in-website calling

1. The owner creates or signs into https://jaas.8x8.vc/ and reviews its current account limits and terms. No subscription, paid plan, new account, domain or external credential was created by this change.
2. Create an application/API key pair. Keep the private key private; it must never be placed in a VITE variable, repository, screenshot, URL or chat message.
3. On the existing production backend service (`srv-da62db0jo6nc73e57fn0`), set `JAAS_APP_ID`, `JAAS_KEY_ID`, and `JAAS_PRIVATE_KEY` in Render Environment. The PEM can contain actual newlines or literal `\n` sequences.
4. Set `MEETING_HOST_USER_IDS` to the confirmed owner's Supabase UUID `79dc007b-cc40-4b68-8533-2625c0163598`. Alternatively, server-managed `app_metadata.meeting_host: true` or `role: admin` grants host permission. Existing devotional editor permission alone does not grant meeting moderator authority.
5. Deploy the backend. GET `/api/meeting-provider/config` reports only `{embedded:true,provider:"jaas"}` when the app/key syntax and RSA private key are locally valid. This readiness check cannot prove the uploaded public key matches or that the provider account/quota is active. A real host/guest rehearsal is mandatory before announcing embedded service.
6. Rehearse from two independent browsers on `/meetings`: host login, guest join without login, two-way audio/video, screen sharing, chat, lobby/password, leave/rejoin and tab navigation. These real provider/media checks are pending the owner's JaaS connection; automated SDK and signing tests are not a substitute.

Configure the account's domain restrictions and wait-for-host/lobby policies in JaaS for the church origin. Guest token minting is public and rate-limited per API IP; signed room permissions do not replace provider quotas and abuse protection. Public meeting links remain bearer invitations and should be shared privately when appropriate. Do not activate during an ongoing public-service call because provider rooms are separate.

## Events

`/events` reads published rows from Supabase. It supports search, categories, upcoming/past views, Nigeria-time display, calendar export and event details. The sample 2024 gatherings and invented attendance counts are removed. No actual church dates were invented or published.

`/admin/events` uses the existing editorial login. Existing server-verified devotional editors and administrators can manage events; an event_editor app claim is also accepted by event routes if a separately issued valid Supabase session is used. Editors can save drafts, publish/unpublish confirmed details, choose an existing site image, attach a unique online room, enable/close registration and read paginated private registration lists. Event writes use revision checks and creation keys to avoid lost edits and duplicate creation on retry. The current list is capped at 200 events.

Registration collects only name, email, attendee count and explicit consent for that event. No phone, accommodation/health notes or newsletter signup is collected. A database function checks published/open/not-ended state and inserts in one transaction. Duplicate email/event submissions receive the same generic success without disclosing whether someone already registered. Confirmation appears only after a successful database response. This implementation does not send email confirmations, reserve capacity, process payments or announce an event on social media.

Apply `database/ministry-events-setup.sql` once to the church database. New tables have RLS enabled, no anon/authenticated/PUBLIC grants or policies, and service-role privileges only. The registration function is SECURITY INVOKER, has a fixed empty search_path, and is executable only by service_role. All public access is through bounded Express handlers. The new schema is separate from preexisting donation/devotional data. Existing API CORS rules are retained. In-process rate limits supplement provider limits and are reset on service restart; configure perimeter protection before high-volume promotion.

## Validation

Automated checks cover room-scoped RSA signatures, guest/host authorization, session refresh role checks, SDK lifecycle/disposal, honest public-service fallback, event validation and timezone handling, registration failure/success, staff access, and concurrent edits. Before deployment run both npm test suites and npm run build. Database transaction checks must roll back all synthetic event and attendee fixtures. Do not submit synthetic data to the public registration form or create real test meetings without an explicit rehearsal.
