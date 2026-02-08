# Teams-Style Meeting Module

Full-featured meeting scheduling and video conferencing using **Jitsi Meet** (video, audio, chat, screen share) with secure join links and email/social sharing.

## Features

- **Scheduling**: Title, date, time, duration, description. Admin-only create/edit/cancel.
- **Secure links**: Each meeting has a unique `joinToken`. Share link: `/meetings/room/:id?token=...`
- **List & calendar views**: Toggle between list and month calendar on the Meetings page.
- **Jitsi Meet**: In-browser video/audio, mute/camera/speaker view, screen sharing, real-time chat, participant list. Join/leave toasts when using the embed API.
- **Invitations**: Email invite form on meeting detail (backend can send via SendGrid). Copy link + share to Facebook, Twitter, WhatsApp, LinkedIn.
- **Roles**: Admin can schedule, edit, cancel, send invites. All authenticated users can join via link.

## Frontend Routes

| Route | Description |
|-------|-------------|
| `/meetings` | List/calendar of meetings; "Schedule meeting" (admin only) |
| `/meetings/schedule` | Create meeting (admin only) |
| `/meetings/:id` | Meeting detail, join button, share, invite by email, edit/cancel (admin) |
| `/meetings/:id/edit` | Edit meeting (admin only) |
| `/meetings/room/:id` | Jitsi room. Use `?token=...` for secure join. |

## Backend API (Express)

- `GET /api/meetings` – List meetings (optional `?status=scheduled`)
- `GET /api/meetings/:id` – Get meeting (includes `joinToken` for share link)
- `POST /api/meetings` – Create (body: title, description, startTime, endTime, inviteEmails[]). Returns `id`, `joinToken`, `roomName`.
- `PATCH /api/meetings/:id` – Update (title, description, startTime, endTime)
- `POST /api/meetings/:id/cancel` – Set status cancelled (body: reason?)
- `POST /api/meetings/:id/invites` – Send invites (body: emails[]). Configure SendGrid for real email.
- `GET /api/meetings/:id/join?token=...` – Returns Jitsi URL and room name. If meeting has `joinToken`, `token` query is required.

Data is stored in `backend/meetings.json`. For production, use Postgres and move tokens/meetings into a proper schema.

## Env (backend)

- `JITSI_DOMAIN` – Default `meet.jit.si`. Use your own Jitsi server for E2EE/custom config.
- `FRONTEND_ORIGIN` – Origin of the React app (e.g. `https://yoursite.com`) for invite links.
- `SENDGRID_API_KEY` – Optional; implement email sending in `POST /api/meetings/:id/invites`.

## Env (frontend)

- `VITE_JITSI_DOMAIN` – Same as backend (optional; defaults to meet.jit.si).
- `VITE_API_URL` – Backend API base (e.g. `http://localhost:5000/api`).

## Security

- Join links are token-based; without the token, `GET /api/meetings/:id/join` returns 403.
- Scheduling and edit/cancel require admin login (AuthContext `isAdmin`).
- For Jitsi room password or JWT (e.g. moderator-only), extend the backend to return a password or signed JWT and pass it into the Jitsi embed config.

## Optional: Email & calendar

- **SendGrid**: In `POST /api/meetings/:id/invites`, call SendGrid with an HTML body containing the meeting title, time, and join link.
- **Calendar (.ics)**: Generate an ical file with DTSTART/DTEND and attach or link in the email so invitees can add to Google Calendar / Outlook.

## Optional: Recording & analytics

- Jitsi supports recording when using your own Jibri/Jigasi setup; configure on the Jitsi server.
- For analytics (participant count, duration), use Jitsi Meet API events (e.g. participantJoined/Left) and send to your backend from the frontend, or use Jitsi’s post-meeting webhooks if available.
