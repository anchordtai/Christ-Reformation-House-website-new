# Live Stream, Donations, Meetings & Social Automation – Integration Guide

This document describes how to connect the new frontend modules to your backend and external services.

## 1. Environment variables

Create a `.env` file (and `.env.example` without secrets) with:

```env
# API
VITE_API_URL=https://your-api.com/api

# Live stream (Facebook)
VITE_FACEBOOK_PAGE_ID=your_page_id
VITE_FACEBOOK_VIDEO_ID=your_video_or_page_id
VITE_FACEBOOK_APP_ID=your_app_id

# Payment gateways (public keys only; keep secret keys on server)
VITE_STRIPE_PUBLIC_KEY=pk_live_...
VITE_PAYSTACK_PUBLIC_KEY=pk_live_...
VITE_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-...
```

Backend-only (never in frontend):

- `FACEBOOK_PAGE_ACCESS_TOKEN` – for Graph API (live comments, post)
- `STRIPE_SECRET_KEY`, `PAYSTACK_SECRET_KEY`, `FLUTTERWAVE_SECRET_KEY`
- `TWITTER_BEARER_TOKEN`, etc. for social automation

## 2. Backend API endpoints

Implement these on your server (Node, serverless, etc.):

### Live stream

- **GET /api/live/status** – `{ live: boolean, videoId?: string }`
- **GET /api/live/comments/:videoId** – proxy to Facebook Graph API; return `{ data: [{ id, message, from: { name } }] }`

Use Facebook Graph API with a Page access token to read live comments; never expose the token to the client.

### Payments

- **POST /api/payments/create**  
  Body: `{ amount, currency, gateway: 'stripe'|'paystack'|'flutterwave', donationType, name, email }`  
  Response: `{ redirectUrl }` (for Paystack/Flutterwave) or `{ clientSecret }` (for Stripe Elements)

- **POST /api/payments/verify**  
  Body: `{ reference }`  
  Response: `{ verified, transactionId }`

Implement server-side verification for each gateway before marking a donation as completed.

### Meetings

- **GET /api/meetings** – list: `{ data: [{ id, title, description, startTime, endTime }] }`
- **POST /api/meetings** – create: body `{ title, description, startTime, endTime, inviteEmails[] }`, return `{ data: { id, ... } }`
- **POST /api/meetings/:id/invites** – body `{ emails[] }`; send emails and optionally calendar (.ics) attachments
- **GET /api/meetings/:id/join** – return `{ url }` (e.g. Jitsi Meet URL or Google Meet link)

Generate Jitsi URLs like: `https://meet.jit.si/YourChurch-${meetingId}` (or use your own Jitsi server).

### Social automation

- **POST /api/social/post** – body `{ title, body, link?, imageUrl?, platforms: { facebook, twitter, instagram, linkedin } }`  
  Use server-side tokens to post to each platform (see `api/social-post.js` for a serverless example).

- **GET /api/social/scheduled** – optional; return scheduled posts for an admin UI.

## 3. Auth (JWT / session)

- **POST /api/auth/login** – body `{ email, password }`, response `{ token, user }`
- **GET /api/auth/me** – requires `Authorization: Bearer <token>`, returns current user

The app stores the token in `localStorage` and uses it in the `Authorization` header. For higher security, consider httpOnly cookies and CSRF (see `utils/security.js` for `getCsrfToken()`).

## 4. Security checklist

- **HTTPS** everywhere in production.
- **Input sanitization**: user content is passed through `sanitizeHtml()` / `sanitizeAttr()` before display (see `utils/security.js`).
- **CSRF**: add a CSRF token to forms and send it in a header or body; backend validates it.
- **Tokens**: keep all API keys and long-lived tokens on the server; use serverless or backend routes to call Facebook, Stripe, Paystack, Flutterwave, Twitter, etc.

## 5. Social automation (cron / serverless)

The file `api/social-post.js` is an example serverless function that:

- Accepts POST with `title`, `body`, `link`, `imageUrl`, `platforms`
- Uses env vars for Facebook Page ID and access token, Twitter bearer token, etc.
- Posts to Facebook (and optionally Twitter); Instagram/LinkedIn need additional setup (media upload, OAuth).

For daily blog/announcement posting:

1. Deploy this function (e.g. Vercel, Netlify).
2. Call it from a cron job or from the Social automation page (which calls your backend, and the backend can call this function or replicate the logic).

## 6. Optional: TypeScript

For type safety, you can migrate modules to TypeScript:

- Add `typescript`, `@types/node` as dev dependencies.
- Rename key files to `.tsx`/`.ts` (e.g. `context/AuthContext.tsx`, `services/api.ts`).
- Define interfaces for API responses and props.

The existing JS code will work as-is; migrate incrementally if desired.

## 7. Virtual / 3D background (optional)

For a “virtual altar” or 3D background behind the stream:

- Use a streaming tool (OBS, vMix) with a browser source or image/video layer.
- Or integrate a WebGL/Three.js scene in an internal broadcaster app that captures the scene and sends to RTMP; the current React app only embeds the resulting stream (e.g. Facebook Live).

No changes are required in the React app for this; it is handled in the streaming pipeline.

## 8. SEO and performance

- **MetaTags**: use the `<MetaTags title="..." description="..." />` component on each page.
- For richer social sharing, add `react-helmet-async` and set `og:image`, `og:title`, `twitter:card`, etc.
- Ensure the backend serves correct meta for the initial HTML if you use SSR or pre-rendering.
