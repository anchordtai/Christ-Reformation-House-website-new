# November 2026 — Supernatural Provision

Owner request: three November happy-new-month banners with Apostle (Dr) Anchord Taiwo's picture, a robust homepage slider, related ministry page placement, and social sharing throughout the first week. Owner correction: each banner must use a different suit colour.

## Designs and assets

Built-in image generation used the existing approved ministry portrait (`ministering-pink.webp`) and church logo as references. Three finished campaign designs were inspected. The second and third were edited with the image tool to change suit colours while preserving the portrait identity, layout and Bible copy.

| Banner | Suit | Design | Bible text |
| --- | --- | --- | --- |
| 1 | Rose pink | Emerald and gold / harvest | Philippians 4:19 KJV |
| 2 | Royal blue, champagne tie | Midnight and champagne | Psalm 23:1 KJV |
| 3 | Ivory white, burgundy tie | Ivory and burgundy / sunrise | Matthew 6:33 KJV |

Website images: `public/assets/campaigns/november-2026/banner-1.webp` through `banner-3.webp`. Social/download copies: `banner-1-social.jpg` through `banner-3-social.jpg`, all 1080×608. Compression/size exports preserve the full artwork and text. No cropping. These sizes address the over-1080-pixel rejection observed on an existing devotional TikTok post; this campaign does not edit that prior post.

Prompt set: coordinated landscape church campaign with exact church name, Happy New Month / November 2026 / Supernatural Provision, pastor name, website and KJV quotation; preserve the provided facial identity. Design 1: emerald/gold harvest, portrait right, pink suit. Design 2: midnight/champagne, portrait left, royal blue suit. Design 3: ivory/burgundy sunrise, portrait right, ivory white suit. No fabricated events, additional people, financial guarantees or watermark.

## Website behavior

- Homepage: three-slide November welcome replacing the standard hero during November only. Nine-second autoplay, previous/next, direct slide controls, pause/play, arrow keys and horizontal touch swipes.
- Autoplay pauses on hover, focus, manual interaction, hidden browser tab, image failure and reduced-motion preference. Vertical swipe gestures continue normal scrolling.
- Complete banner images retain their aspect ratio; HTML theme/scripture remain readable on small screens. Failed-image states retain the text and offer retry.
- Compact theme link on devotional, blog, watch/live/sermon, events, ministries and prayer/support pages. No campaign ribbon on private staff desks, meeting rooms or donation/payment/store flows.
- `/november`: all three banners, accessible Bible text, devotional/prayer links and 1080px JPG downloads for manual sharing, including WhatsApp Status.
- Month boundaries use Africa/Lagos: active from 1 November 2026 00:00 WAT to 1 December 2026 00:00 WAT. The original welcome returns automatically after expiry, including an already-open tab within 60 seconds. The dated gallery remains available as an archive.
- No changes to scheduled devotional manuscripts or their separate monthly themes.

## Social campaign

Owner authorized social sharing throughout the week. Brand 7758846 is Christ's Reformation House Int'l Inc., owner anchordtai@gmail.com, timezone Africa/Lagos. Connected social handles are Facebook, Instagram and TikTok. Google Business Profile is connected as a directory profile; its post/gallery choice is separate. YouTube, X and WhatsApp publishing are not connected in Metricool; no claim of automatic delivery to those accounts.

Seven campaign posts are planned for 1–7 November at 18:00 Africa/Lagos, distinct from the 08:00 devotional automation. Designs rotate 1,2,3,1,2,3, with all three in the final carousel. Exact copy and scheduling receipts are recorded in `campaigns/november-2026-social.json` when scheduling succeeds. The tool returned no meaningful best-time data, so a consistent evening slot is used. Generated-media labels are retained in supported provider metadata.

The existing daily devotional automation is not duplicated, paused or modified. Social scheduling and website merge/deployment are separate: new PR release requires the owner's explicit per-PR approval. Do not claim posts published merely because scheduling was accepted.

## Validation

114 frontend tests pass, including nine new campaign tests for month boundaries, fallback/expiry, all assets, manual/keyboard/swipe controls, reduced motion, pause/play and failed images. Production build passes. Browser QA covers the homepage controls and related-page/gallery links. Website images remain under 300KB each, with no additional image library or paid service.
