# CRH release and remaining dependencies — 31 October 2026

This register distinguishes implemented work from owner setup and proposed future features. It does not mark provider-dependent work complete.

## Completed and deployed before this blog change

- Embedded JaaS meeting host/guest controls; owner confirmed calls work.
- Watch/broadcast control and local KJV Bible reader. Ministry YouTube channel linked.
- Persisted Contact inbox and Church Store catalog/verified-payment architecture.
- Cloudflare verification and private staff chat; owner confirmed both work.
- Devotional reader/search/bookmarks/mark-read and privacy-controlled reading history.
- PR #27 merged and deployed; footer: Christ's Reformation House International Inc. / CAC REGISTRATION NUMBER 178735.
- Zoho church email: owner confirmed sending and receiving.

## Ready in the blog pull request

Real journal data, staff editing, private images, reviewed Lagos schedules, reader interactions, comment moderation, social preview HTML and optional staff AI assistance. Blog schema is applied, but website/API release still requires merging/deploying the new PR. No sample content is published. Current blog tables contain no articles/comments.

Compatible Express 5.3.0 and CORS 2.8.6 updates are included and overlap #21/#25. Build/routing security updates resolve the Vite/esbuild and React Router advisories and overlap dependency PRs #22/#26. The full frontend and backend suites pass. Eleven moderate audit findings remain in development lint tooling. Backend/runtime audit: zero findings. Staff/editor modules are loaded only when needed.

## Owner inputs or accounts still required

| Item | Next concrete dependency |
| --- | --- |
| Real live service on website | Supply/select the actual YouTube video/live ID in the broadcast desk; channel URL alone cannot identify the current broadcast. Complete the OBS/audio/camera rehearsal. |
| Live on Facebook at the same time | Configure real platform live permissions/stream keys and the church's broadcasting device/software; do not expose keys in chat. Social sharing links are not simultaneous video distribution. |
| Store launch | Enter real products, prices, quantities, collection instructions and licensed images in `/admin/store`; owner must complete a real low-value settlement rehearsal. No invented stock or test charges. |
| Daily devotional email | An opted-in subscriber/delivery workflow plus a compatible SMTP or transactional email provider credential and verified sender are needed. A working Zoho mailbox does not by itself configure website notifications. No sending credentials are currently wired. |
| Generative blog AI | Owner-selected free Gemini project/model and Render secrets; review provider terms and keep paid billing disabled. Inactive until configured; no AI request has run. |
| Staff MFA | Owner authenticator enrollment and a complete MFA-aware login/recovery flow across editorial, chat and meeting host access. Do not enable partial enforcement that locks staff out. |
| Security alert emails | Verified sender/provider and recipient consent; staff security events are currently viewable in the dashboard. |
| Live translation/audio dubbing | Real source audio and an agreed provider/device approach. Unlimited real-time AI transcription/translation/dubbing cannot be promised within a zero-cost setup. |
| Semantic sermon search | Real sermon transcripts and an approved embedding/model/storage approach. Existing devotional full-text search works without paid AI. |

The daily devotional social automation remains as previously configured; this blog change does not create duplicate automations or send posts. Platform permissions and each automation run remain separate from website publishing.

## Existing pull requests

- #3 is an older platform proposal with obsolete alternative flows; **do not merge it wholesale** into the current deployed ministry/payment/meeting work. Its original checklist predates the later verified fixes. Review any distinct remaining requirement against this register.
- #22/#26 overlap the Vite plugin and Router updates in this blog branch; re-evaluate/close as superseded after that branch lands.
- #21/#25 overlap the compatible CORS/Express updates in this blog branch; re-evaluate/close as superseded after it lands. #23 dotenv18 and #24 Tailwind4 need deliberate migration review. None are merged merely because they are open.

Supabase security advisors show the intentional server-only RLS/no-policy design; no blog browser grants are exposed. Existing donation type GraphQL visibility is public catalog metadata; leaked-password protection remains disabled. Recheck provider free-plan availability before changing Auth plan features.
