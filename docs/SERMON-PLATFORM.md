# CRH free-only Sermon Studio and notification system

## Architecture and preservation

Integrated into the existing React 18 / Vite site and Express 5 API. The current Supabase project, verified editorial authentication, Jitsi/JaaS embedding, host JWTs, lobby controls, donations, event registrations, journal, devotionals, contact and communication desk are retained. No replacement meeting provider, database or paid account is created. `/watch` retains the existing broadcast/video experience; `/sermons` becomes the audio/study library. Existing `/api/sermons` compatibility routes remain unchanged.

New routes:

- `/admin/sermons`: existing editorial sign-in, sermon metadata, audio archive, multilingual text/caption editing, chapters, review, scheduling, archive, history, recovery and automation settings.
- `/sermons` and `/sermons/:slug`: public search, speaker/series/date/language filters, original/filtered/translated audio, native player controls, speed/skip, opt-in local listening progress, transcripts, captions, study notes, share and download.
- `/admin/notifications`: announcements, preview, start/expiry, priority, target pages, pinning, cancellation and history.
- `/notifications`: current ministry updates, dismissal, free sharing and optional foreground browser alerts.
- Existing meeting rooms gain an optional authorised-host recorder. Meeting/provider code is retained; paid JaaS recording, transcription and streaming features remain disabled in host tokens.

Backend modules: `sermon-domain.js`, `sermon-studio.js`, `church-notifications.js`. Browser modules: `SermonRecorder`, `ChurchNotifications`, `browser-recorder.mjs`, `recording-store.mjs`, `sermons.mjs`. Database migration: `supabase/migrations/20261122073638_sermon_studio_and_notifications.sql`.

## Deployment

1. Run frontend `npm ci`, `npm test`, `npm run build`; backend `npm ci`, `npm test`.
2. Apply the reviewed additive migration only to the existing **crh-database**. It adds six RLS-protected, service-only tables, a quota reservation function and one **private** audio bucket. It never edits old records or copies private church data outside the project.
3. Inspect grants, RLS, private bucket state and the existing application health endpoints. Do not disable RLS.
4. Deploy the reviewed commit to the existing Vercel frontend and Render backend. Both Render services already track main; do not trigger duplicate deployments after merging.
5. Verify public library, notifications, signup-independent staff sign-in, original/filtered recording, recovery and first real sermon with the authorised host.

No new environment variables or paid credentials are required. Existing `SUPABASE_URL`, server-only `SUPABASE_SERVICE_ROLE_KEY`, site security and JaaS variables remain unchanged. Never expose these in frontend code or logs.

## Administrator workflow

1. Sign in through the existing editorial account at `/admin/sermons`. API permissions require trusted `app_metadata.role=admin` or `app_metadata.sermon_editor=true`; editable user metadata grants no access. Only an administrator may change automation settings. No roles are assigned by this release.
2. Prepare and save a draft: title, URL name, speaker, date, eligible ministry category, privacy, theme and scripture. Add genuine summary and study notes. Confirm recording consent only after obtaining it.
3. For existing audio, upload the original and an optional separately processed copy. For a meeting, select the prepared draft in its host recorder. Private counselling is not an eligible category and is not automatically recorded.
4. Announce recording to everyone. Select microphone-only or explicitly share the current meeting tab's audio plus microphone. Use headphones to avoid double capture/echo. The browser's screen/microphone permission cannot be bypassed or pre-granted by this application.
5. Start recording, or arm microphone recording to start after the existing Jitsi joined event. Tab capture needs an explicit click. Pause/resume/stop controls affect both copies. Leaving the meeting stops the recorder; closing/crashing a tab can leave partial chunks recoverable on the same browser.
6. Download both local copies before closing the tab. Save them to Studio. Uploads are hash-checked and checked against supported container signatures. This verifies integrity, not the quality or completeness of the spoken message: always listen before approval.
7. Add/edit transcript, translations, WebVTT captions, chapters and study notes. Mark translations reviewed only after checking their meaning and scripture. Unreviewed translation text is excluded from public output and search.
8. Select reviewed original/filtered assets, public visibility, publication time, and explicit release approval. Scheduled sermons appear when the time arrives without requiring a cron job. Archive/unpublish changes visibility while retaining original files. Previously issued short signed download links can remain usable for up to 60 seconds after withdrawal.
9. Automatic/exception publication is disabled by default. It requires a preapproved public draft, recorded consent, a complete browser recording and verified original. Private/interrupted recordings go to review. A failed filtered-copy upload does not destroy or hide the saved original. Automatic does not claim transcription or translation has occurred.
10. Use Notification Studio for scheduled/pinned/expiring announcements. The center also derives updates from released sermons, existing reviewed journal/devotional rows, current events and staff-announced broadcasts. Live recording notices use expiring host heartbeats; stale sessions do not stay falsely live.

## Original preservation, quota and recovery

- Originals are immutable after upload verification. No automatic deletion, retention cleanup or overwriting is performed. Archive is reversible; this release deliberately provides no permanent-delete control for originals.
- Private Storage bucket: `crh-sermon-media`, maximum 20 MiB per file. Only audio WebM, Ogg, WAV, MP3 and MP4/M4A containers are accepted. Video uploads are not accepted; retain video with the existing provider or produce a local artwork video.
- The database serializes upload reservations. Each pending upload reserves the **full 20 MiB**, preventing an understated client file size from bypassing the cap. Studio physical usage plus live reservations is capped at 200 MiB. Project-wide physical usage plus reservations must remain below 900 MiB. Existing other buckets are included in the project guard.
- Pending reservations expire after three hours; signed upload permits last two hours. Physical uploaded objects still count after expiry. Failed/quarantined uploads remain private and counted. There is no automatic paid expansion.
- Recording stops around 18 MiB per copy. At 48 kbps this supports roughly 50 minutes depending on encoding; longer services need separate parts. Browser disk, memory, microphone and codec support vary.
- IndexedDB retains chunks locally for recovery on the same browser/device. Clearing browser storage destroys this fallback. It is not off-site backup. Incomplete containers may require FFmpeg repair. Download originals to your own trusted backup location.
- Storage display is tracked file usage, not a billing meter or whole-account quota dashboard. Upload reservations enforce the stronger physical quota independently.

## Optional offline processing (your computer, never Render)

`tools/sermon_offline.py` performs no uploads and makes no API calls. It refuses to overwrite an existing output directory. It copies the original, then creates a separate FFmpeg-filtered Opus file. The conservative preset applies high-pass filtering, FFT noise reduction, compression and loudness normalization. Listen for artefacts and adjust to the recording; natural voice quality is not guaranteed by a preset.

```
python tools/sermon_offline.py sermon.webm /new/output-directory
python tools/sermon_offline.py sermon.webm /new/output-directory --whisper-model /local/faster-whisper-model
```

Optional dependencies must be installed on your own machine: FFmpeg; faster-whisper for transcription; transformers/PyTorch and a language-compatible Marian model for translation; Piper and a separately licensed local voice model for speech synthesis. All model paths must already exist, all model loading uses local-only mode, and no model is automatically downloaded. Check the particular model/voice's licence and language support. Availability and quality vary significantly for Yoruba, Igbo, Hausa, Greek and Hebrew. A small hosted free instance cannot reliably run these models alongside the live API.

- `--translation-model /local/model --language fr`: produces an unreviewed translated transcript and approximate subtitle timing. Use a model specifically trained for that language pair. Context overflow fails instead of silently truncating text.
- `--piper-model /local/voice.onnx`: uses an installed local Piper executable to generate a labelled voice recording. This is **not** the pastor's voice; voice cloning is not implemented.
- `--artwork approved-image.png`: makes an artwork-and-audio video locally, if FFmpeg supports the required codecs. It does not upload the video.
- Transcription produces TXT/VTT; scripture matches and extractive summary are **draft candidates**, not verified scripture or a theological interpretation. Prayer points, declarations and teaching material remain manually authored/reviewed. Import the TXT/VTT and audio outputs through Studio.

The local inference tools are optional and have not been executed with your private sermon recordings. Running on your own computer may use electricity and storage; no cloud compute is provisioned. This is not an always-on hosted AI worker.

## Language, playback and accessibility

English, Yoruba, Igbo, Hausa, French, Dutch, Greek, Hebrew, Spanish, Portuguese, German, Arabic, Swahili and Chinese are selectable. A selector does not imply a translation exists: unavailable languages explicitly fall back to the original English audio. Reviewed translations can carry transcripts, VTT and labelled translated audio. RTL text is supported for Hebrew/Arabic. Language switching retains audio position. Captions in the custom transcript follow the selected audio; YouTube captions remain controlled by YouTube's player.

Some devices offer installed local text-to-speech voices. The optional device reader uses **localService** voices only and labels them as device speech, not the pastor. It creates no downloadable audio. No external translation/TTS provider, cloning, paid API or live machine translation is called. Native audio controls provide volume, seek, time and duration, with additional skip/speed controls. Remember-progress is opt-in local device storage.

Artwork is server-rendered from safe text and church identity using existing Sharp, navy/plum/gold typography and no fabricated pastor photos. The official logo remains in the site and existing approved portraits remain unchanged. Public artwork and social-crawler HTML are available only for released sermons. The sermon sitemap is linked from robots.txt. Free WhatsApp, Facebook, Telegram, email, copy-link and native-device sharing are provided; these do not automatically post to third-party accounts.

## Notifications and email

Website updates poll once a minute while a page is visible; no paid realtime service is introduced. The API caches the aggregate for 30 seconds and degrades source-by-source. Banner dismissal stores only a bounded list of notice keys on that browser. Scheduled announcements are selected by start/expiry on read. Generated history follows the source publications; custom announcements retain their own rows and revisions.

Browser alerts are optional **foreground** notifications while this website is open. The site never prompts immediately on load. Background Web Push is not implemented and is not claimed. The site notification center works without browser permission.

Optional sermon email automation is OFF by default. An administrator can enable it only with the existing verified free email configuration. The existing communication worker then creates one campaign per future sermon, selects **verified active subscribers who consented to service updates**, uses the existing 280/day cap, rechecks consent and sermon revision/privacy before sending, and records provider acceptance separately from delivery. Unpublishing/changing a sermon cancels stale queued deliveries. No SMS or WhatsApp API is used. Existing subscription verification, preferences, suppressions, unsubscribe and campaign controls remain in the Communication Desk.

The existing GitHub worker workflow gains an hourly standard Ubuntu schedule in this **public repository**; it remains a no-op without the existing worker secret and configured sender. No secret is retrieved or created. Scheduled Actions can be delayed, skipped, or disabled after repository inactivity. Free Render cold starts can delay processing. This is a best-effort free queue, not a real-time delivery guarantee. Administrators can run the existing workflow manually and inspect delivery status. No actual campaign or message is created/sent as a deployment test.

## Free-cost audit

| Capability | Implementation | Added service cost | Practical limit |
|---|---|---|---|
| Meetings | Existing Jitsi/JaaS integration; paid token features stay false | ₦0 added | Existing provider allowance and meeting permissions |
| Recording | MediaRecorder in host browser | ₦0 | Consent/permission, open tab, supported codec; tab-audio support varies |
| Audio filtering | Web Audio high/low-pass and compressor; separate original | ₦0 | Not studio mastering or guaranteed noise removal |
| Advanced enhancement | Optional local FFmpeg | ₦0 service fees | User computer and installed codecs required |
| Transcription | Manual TXT/VTT or optional local faster-whisper | ₦0 service fees | No always-on hosted model; local resources needed |
| Study materials | Editable manual notes; optional extractive local draft | ₦0 | No hosted generative sermon authoring |
| Translation | Manual reviewed text or optional local model | ₦0 service fees | Language/model quality varies; no live hosted translation |
| Speech | Installed local browser voice or optional local Piper | ₦0 service fees | Not pastor voice; device reader has no audio download |
| Video | Existing YouTube; optional local FFmpeg artwork video | ₦0 added | No new hosted video processing/storage |
| Storage | Existing Supabase private bucket | ₦0 added | 20 MiB/file, 200 MiB studio guard, 900 MiB project guard; free egress limits still apply |
| Hosting | Existing Render free service and existing Vercel site | ₦0 added | Cold starts, ephemeral filesystem, shared free limits |
| Updates | Bounded polling and read-time schedules | ₦0 added | About a minute of delay; works while API is available |
| Email | Existing verified free sender, opt-in automation | ₦0 added | Existing cap/consent/worker secret; no paid fallback |
| Browser alerts | Native Notifications API, user opt-in | ₦0 | Foreground only; background push unavailable |
| Sharing | Native public links and share dialogs | ₦0 | User finishes posts in the chosen platform |
| Scheduled worker | Existing public-repo standard GitHub Actions workflow | ₦0 added | Best effort; no larger runner or artefact uploads |

Provider references checked on 22 November 2026: https://render.com/docs/free ; https://supabase.com/pricing ; https://docs.github.com/en/billing/concepts/product-billing/github-actions ; https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia . No billing, paid plan, trial, payment method, paid model, recording provider or automatic paid fallback is activated by this release. Existing account billing arrangements and third-party invoices are not changed or represented as a new cost audit guarantee.

## Test scope and remaining acceptance test

Automated tests cover API authorization, untrusted-role rejection, publication consent/review, immutable recording metadata, private Storage, raw size/hash/container checks, concurrent-safe quotas, free-setting defaults, media-source selection, captions, mock original/filtered recorder lifecycle, permission failures, and the existing meeting/lobby/events/donations/publication tests.

A real host microphone/tab recording, acoustic quality review, real meeting participant consent, optional local AI models and an actual subscriber delivery need the owner’s device/account and genuine content. They must not be reported as tested merely because a build or mock passed. No real sermon, private recording, client identity or financial record is fabricated for testing.
