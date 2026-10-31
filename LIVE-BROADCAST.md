# CRH Watch Live and Bible reader

## Delivered foundation

The existing React/Vite site keeps `/watch`, `/live`, `/sermons` and existing sermon routes. The new Watch page embeds a ministry-selected YouTube video only after the visitor clicks play. Its logo, giving link, Bible and sharing controls load without waiting for the video provider. Staff manage the singleton listing at `/admin/broadcast` using their existing editorial account. No additional paid service, provider key or streaming subscription is introduced.

The Node/Express API on the existing free Render service exposes `GET /api/live-broadcast`. It returns only the public listing, never staff identity or revision data. Staff reads/writes require a confirmed Supabase user and server-managed editorial/admin permissions. Writes are revision guarded. The new Supabase table has RLS enabled, no public/reader grants, and server-only select/update access. Its initial state is offline with no video configured. Render may still cold-start; this work does not claim to remove the free-plan sleep delay.

## Broadcast workflow

1. Enable live streaming on the church YouTube channel. First activation may take up to 24 hours. Use a channel the church controls and check account eligibility.
2. Install OBS Studio from https://obsproject.com/ on the ministry computer. Add camera, microphone/mixer and the original church logo as sources. Test audio before the service.
3. In YouTube Studio, create an encoder live stream and enable embedding. Keep stream keys in OBS/provider settings, never in the website, repository or chat.
4. On `/admin/broadcast`, paste that video's YouTube watch/live/youtu.be link. Channel links are not video links. Enter title and description. Dates entered here are Nigeria time (Africa/Lagos).
5. Choose Scheduled and enter the expected start and end. The site does not automatically claim a scheduled service has begun.
6. Start the actual stream in OBS and YouTube, check picture/audio on a second device, then set the website listing Live. Changing website status does not start or stop OBS or a social broadcast.
7. Share `https://www.christreformationhouse.org.ng/watch`. The website provides WhatsApp/Facebook sharing, copy and supported native share actions. These prepare user-operated sharing; they do not silently publish to church accounts.
8. After the stream, use Replay to retain the recording, or Offline to hide playback. Live/scheduled listings expire at their end time, up to 12 hours after the start. Visitors refresh listing data roughly every minute; the provider controls actual media availability.

Use the free third-party OBS Multiple RTMP Outputs plugin only after checking OS/OBS compatibility and rehearsal. It can send the same production to YouTube and Facebook, at the cost of additional local upload bandwidth. Configure Facebook destinations in Facebook Live Producer. Facebook/Instagram/TikTok eligibility and stream-key access are provider controlled. Restream's free plan currently does not include streaming to Facebook Pages, so it is not part of this zero-subscription implementation. No real broadcast or social announcement was started during development.

## Bible and giving

The KJV reader includes 66 books, 1189 chapters and 31102 verses. It fetches one local book at a time, only when opened; no paid Bible API or AI-generated scripture is used. It supports chapter/verse selection, text size, navigation and copying. Source commit and license are in `public/bible/kjv/SOURCE.md` and `LICENSE.txt`. The data import preserves verse wording. The giving button navigates to the existing `/donate` route; payment integrations, credentials and verification are unchanged. No payment was made.

## Honest limitations

This is original English video/audio playback, not a standalone audio radio service. Provider controls supply volume, fullscreen and captions when available. Private, deleted, embedding-disabled or region-restricted videos may require the visible YouTube fallback link. Live status is set by staff and expires by time; it is not automatically verified with YouTube's Data API. No channel, video ID, viewers, translated output or service dates are invented.

Real-time multilingual speech, separate audio-only streams, automated social live simulcasting, and AI chat/security providers are not configured. A future provider-independent pipeline would be: authorized English audio ingest -> timestamped transcript -> shared per-language translated segments -> licensed speech synthesis -> dedicated distribution. It requires verified language coverage, consent, glossary review, operating resources, quotas and spending controls. No claim of reliable unlimited free translation is made. This module has no translation charges; existing hosting, internet/data, power/equipment and platform limits still apply.

## Deploy and verify

The schema is tracked in `backend/live-broadcast-schema.sql` and was applied to the approved CRH database with an offline seed. It is a one-time schema file, not an idempotent re-run script. Do not reapply if the table exists. No new environment variables are needed; the backend reuses its existing Supabase configuration. Deploy backend and frontend from the same reviewed commit, then check `/api/live-broadcast` and `/watch`.

Validation: frontend automated tests cover URL allowlisting, offline/outage behavior, lazy playback, Bible data and navigation, donation navigation, and signed-out staff access. Backend tests cover public data minimization, authorization, time windows and stale edits. Real camera/microphone ingest, YouTube embedding and Facebook simulcast need a church-owned source and a rehearsal on the broadcast computer. Preview origins are not added to the backend CORS allowlist, so preview status requests can fail while the Bible/UI remains reviewable.

Rollback: revert this feature commit through a PR and redeploy the frontend/backend. Keep the new table offline; it is unused by the previous version. Do not drop it or modify existing donation/devotional tables. To stop listing a stream without a rollback, select Offline in the broadcast desk.
