# Sunday visitor and meeting experience

This frontend update extends the existing GitHub/Vercel website. It does not change payment processing, Render settings, database schemas or hosting providers.

## Visitor experience

- Landing page: preaching cards, a salvation invitation, prayer support, testimony sharing, online fellowship, accessible navigation and a floating Give button. Existing portrait slider and reduced-motion behavior remain.
- Watch: three topic cards link to the configured ministry Facebook page, as selected by the owner. These are not individual video embeds. Supply actual sermon URLs to feature specific recordings.
- Salvation and prayer: visitor guides with Bible references and links to contact the ministry.
- Testimonies: no invented public stories. The form requires consent to contact, separates publication permission, and prepares a WhatsApp/email draft that the visitor reviews and sends. No story is automatically stored, transmitted or published. Owner-approved stories can be added to src/content/ministry.js with publication consent.
- Ministry assistant: local prepared FAQ answers, not an LLM or a live pastor. It provides ministry WhatsApp links. Chat messages remain in page memory, are bounded in length/history and are not saved or sent to a chatbot service. It and the floating Give button are hidden during checkout and on new meeting-room pages.

## Meetings

The owner selected direct calls instead of an embedded deployment requiring JaaS credentials. The public center creates cryptographically random room invitations, validates supported incoming church/Jitsi links, offers copy/share drafts, and downloads calendar invitations. Planning is local; it does not publish official events or automatically email anyone.

Calls open directly on meet.jit.si, whose interface provides audio, video, screen sharing, chat and host controls. Official Jitsi guidance requires host sign-in and limits public sessions to 95 minutes. This is an external meeting service, not a self-hosted Google Meet equivalent. For longer services, plan a break/new room or provision a suitable production meeting service.

Local camera/microphone checks request permission only when clicked. Media is not uploaded or recorded by the website. Tracks stop when previews close, when components unmount, and when launching the external call from the invitation page. Permission rejection is actionable. External meeting privacy and security controls are managed by Jitsi. Enable the lobby/password before sharing invitations. Random URLs reduce guessing but do not replace a room password or host moderation.

Official references:
- https://jitsi.org/jaas/
- https://jitsi.org/blog/changes-coming/
- https://jitsi.org/blog/authentication-on-meet-jit-si/

## Validation

- npm test: 37 passing tests, including all 19 existing donation UI regressions.
- npm run build: production build passed.
- New tests cover random invitations, unsupported/phishing URLs, local preview origins, calendar UTC timing and escaping, prepared assistant answers/focus/privacy, consent-gated testimony drafts, invitation creation, device denial, closing previews, and delayed camera permission responses.
- Desktop browser: landing sections render with no missing images or horizontal overflow; assistant Giving answer and Escape dismissal work; meeting creation opens the intended invitation page; its provider URL reaches Jitsi's pre-join screen.
- Responsive CSS includes single-column layouts and mobile navigation. Actual mobile-device testing and a real multi-party media call remain required; automated device tests use mocked media streams.
- No real charge, outgoing testimony/message, host authentication or live meeting was initiated during testing.

## Before Sunday

1. Host opens Meetings, creates an invitation and opens Jitsi. Complete the host sign-in in your own browser.
2. Enable lobby/password, then invite one trusted guest from another device/network.
3. Confirm two-way audio/video, mute/unmute, speaker output and reconnect behavior.
4. From a desktop, share a window; confirm the guest can see it and that stopping sharing works.
5. Check guest chat, admitting/removing participants and mobile joining.
6. Plan for the 95-minute public-service limit. Save and share the final invitation only after this rehearsal.
7. Review public ministry content and test Facebook/WhatsApp destinations on the devices your visitors use.

The broader backend platform draft PR #3 is separate and must not be merged as part of this release. This update does not establish that every legacy website feature is operational.
