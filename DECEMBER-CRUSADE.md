# December Fire Crusade slider review

Approved for publication on 7 November 2026 after the owner requested removal of the video slide.

## Findings and changes

The existing component is `src/components/HeroCarousel.jsx`. Its two approved portrait slides and seven-second interval worked. Keyboard focus and every manual selection permanently paused autoplay until Play was pressed. Touch navigation was missing. The component is extended with seven-second cycling, hover/resume, keyboard focus protection, swipe detection that allows vertical scrolling, next-image preloading, media error fallback, and reduced-motion support. An intentional Pause remains in force on mouse leave. The browser suspends rotation when hidden.

The carousel contains five image slides. They are the newly requested white-suit and gold-tie crusade flyer, two new illustrative prayer scenes, the two existing ministry portrait slides. The dated crusade slides expire at midnight Africa/Lagos on 14 December 2026. The two ministry slides then continue.

## Files changed

- `src/components/HeroCarousel.jsx` contains the extended carousel and existing-event lookup.
- `src/content/december-crusade.mjs` contains the supplied event copy, media list, expiry and event matching.
- `src/styles/hero-carousel.css` contains responsive presentation and media styles.
- `test/hero.test.cjs` contains 13 slider tests.
- `public/assets/campaigns/december-2026/` contains ten responsive WebP variants, the video poster, caption track and four MP4 exports.
- This report records sources, checks and remaining work.

## Media provenance and formats

The approved flyer was recovered from `Emerald and Gold Crusade Flyer.png` and is preserved as `approved-flyer.webp`. The owner then requested a new white-suit and gold-tie design. It was created with the image generator using the original microphone photograph as the identity reference and the prior flyer as the style reference. The owner corrected the likeness to match the existing homepage portrait. The final first slide is `homepage-portrait-flyer.webp`, using `ministering-pink.webp` as the identity reference while retaining the white suit, gold tie and poster design. Earlier flyer versions are preserved. The owner approved publication after the homepage portrait correction. The owner confirmed Rainbow Street, which is used throughout the HTML, video overlays and captions.

Two prayer scenes were made with the built-in image generator. They are illustrative scenes with fictional congregations. The foreground minister is shown from behind, and the other minister is distant. Neither scene reconstructs the pastor's face. The slider captions identify the scenes as illustrative artwork. Originals remain with the generated images. Responsive exports are stored alongside the campaign media.

The source for the portrait invitation is the existing `public/assets/img/PHOTO ANCHORD_T.png`. It shows the pastor holding a microphone in a black suit, white shirt and red tie. The photo is proportionally resized and placed in the video without face reconstruction or clothing edits. This is the cinematic slideshow fallback authorised in the brief. Authentic walking, hand gestures or live preaching footage was not available. The 12-second soundtrack is an original synthesized instrumental pad, with no voice or third-party music.

| File | Format | Dimensions | Duration |
| --- | --- | --- | --- |
| `crusade-landscape.mp4` | H.264/AAC | 1920 × 1080 | 12 seconds |
| `crusade-reels.mp4` | H.264/AAC | 1080 × 1920 | 12 seconds |
| `crusade-website.mp4` | H.264/AAC | 1280 × 720 | 12 seconds |
| `crusade-whatsapp.mp4` | H.264/AAC | 960 × 540 | 12 seconds |

Every MP4 is below 400 KB with fast-start metadata. The video exports remain available as separate assets. The homepage slider contains images only. The high-resolution WebP originals and 960px variants use responsive sources. All campaign assets total approximately 3 MB, with no video loaded by the homepage slider.

The image prompts requested a 16:9 Nigerian revival scene in royal blue, gold and subtle orange, first viewed from the altar across the crowd with a minister seen from behind, then from the rear-side of the auditorium toward a distant stage. Both prompts required realistic anatomy, dignified worship and no text, medical conditions or miraculous visual effects.

## Event integration and remaining steps

The public events endpoint and the existing `public.ministry_events` table were inspected. Neither contained a December crusade entry. The registration CTA remains disabled with an explanatory message until a published matching event is available. When staff publish the gathering with registration enabled, the carousel uses `/events/register/<existing-event-id>` and the existing registration system. No duplicate event or registration system was created.

Staff need to publish the event through `/admin/events`, including its confirmed end time on 13 December. The supplied 5 PM daily start is available, but the final session end time was not supplied. The watch CTA uses `/watch#broadcast`, the current ministry broadcast page. The carousel states that the crusade starts on 7 December. Staff can announce the actual stream through the existing broadcast desk when it is ready.

## Verification

The complete frontend suite passes with 139 tests. The production Vite build passes. Slider tests cover five local image slides, controls and wrapping, autoplay, explicit pause, hover/resume, manual navigation followed by autoplay, touch versus vertical scrolling, reduced motion, hidden-tab suspension, existing event routing, missing-event handling, image-only slides, image fallback, and campaign expiry.

Real-browser checks use the live development preview, including desktop, 390px and 768px iframe viewports. Responsive checks inspect horizontal overflow and media presentation. Video playback is verified through the full 12-second duration, readyState 4 and ended status, with muted playback. Swipe gestures are verified in DOM interaction tests. Hardware touchscreen testing remains available to the owner. The owner approved publication of the image-only slider.
