# Database Schema (Neon PostgreSQL)

The file **schema.sql** defines the full PostgreSQL schema inferred from the React app (sermons, events, blog, devotionals, donations, prayer requests, contact, store, meetings, payments, auth, social posts, live stream).

## How to use

1. Open your [Neon](https://neon.tech) project and go to the SQL Editor.
2. Paste the entire contents of **schema.sql**.
3. Run the script. It uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`, so it is safe to run multiple times.

## Tables overview

| Table | Purpose |
|-------|--------|
| users | Auth: email, password_hash, role, is_admin |
| refresh_tokens | Optional JWT refresh tokens (hashed, with expires_at) |
| sermons | Sermon title, speaker, category, date, duration, video_url, transcript, scripture |
| events | Events with date, time, location, category |
| event_registrations | Event sign-ups (event_id, name, email, phone, number_of_attendees) |
| blog_posts | Blog title, author, excerpt, content, category, published_at |
| devotionals | Daily devotionals by date (title, scripture, content, prayer) |
| donations | Donations and payment verification (amount, type, transaction_id, status) |
| prayer_requests | Prayer requests (type, request text, optional anonymity) |
| contact_messages | Contact form submissions |
| store_products | Church store products (name, price, category) |
| store_orders | Orders with optional user_id |
| store_order_items | Order line items (order_id, product_id, quantity, price) |
| meetings | Scheduled meetings (title, start/end, join_token, room_name, status) |
| meeting_invitations | Invitee emails per meeting |
| payments | Payment intents (gateway, reference, status) for Stripe/Paystack/Flutterwave |
| live_stream_status | Optional live stream config/cache |
| social_posts | Social automation (title, body, platforms, scheduled_at, posted_at) |

## Security notes

- **users**: Store only bcrypt/argon2 password hashes; never plain passwords.
- **refresh_tokens**: Store hashed token and enforce expires_at; delete on logout.
- **meetings.join_token**: Validated server-side for join URL; add join_token_expires_at if you need time-limited links.
- **donations.transaction_id**: Unique index for idempotent verification.
- Use Row Level Security (RLS) and service role for production where appropriate.

## UUIDs

All primary keys use `uuid_generate_v4()`. Ensure the `uuid-ossp` extension is enabled (the script runs `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`).
