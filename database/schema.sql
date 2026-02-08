-- Christ's Reformation House - PostgreSQL Schema (Neon-compatible)
-- Generated from React app analysis. Run in Neon SQL Editor.
-- Requires: CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== USERS & AUTH ====================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255),
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin', 'moderator')),
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- Optional: refresh tokens for JWT rotation (store hashed token, expire old ones)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);

-- ==================== SERMONS ====================
CREATE TABLE IF NOT EXISTS sermons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  speaker VARCHAR(255),
  category VARCHAR(100),
  description TEXT,
  "date" DATE,
  duration VARCHAR(50),
  image VARCHAR(1000),
  video_url VARCHAR(1000),
  transcript TEXT,
  scripture TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sermons_date ON sermons ("date");
CREATE INDEX IF NOT EXISTS idx_sermons_category ON sermons (category);
CREATE INDEX IF NOT EXISTS idx_sermons_title ON sermons (title);

-- ==================== EVENTS ====================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  "date" DATE,
  "time" VARCHAR(50),
  location VARCHAR(500),
  image VARCHAR(1000),
  category VARCHAR(100),
  attendees INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_date ON events ("date");
CREATE INDEX IF NOT EXISTS idx_events_category ON events (category);

CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  number_of_attendees INTEGER NOT NULL DEFAULT 1,
  special_requests TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations (event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_email ON event_registrations (email);

-- ==================== BLOG ====================
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  author VARCHAR(255),
  excerpt TEXT,
  content TEXT NOT NULL,
  image VARCHAR(1000),
  category VARCHAR(100),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts (published_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts (category);

-- ==================== DEVOTIONALS ====================
CREATE TABLE IF NOT EXISTS devotionals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "date" DATE NOT NULL UNIQUE,
  title VARCHAR(500) NOT NULL,
  scripture VARCHAR(255),
  scripture_text TEXT,
  content TEXT NOT NULL,
  prayer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devotionals_date ON devotionals ("date");

-- ==================== DONATIONS ====================
CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount DECIMAL(12, 2) NOT NULL,
  donation_type VARCHAR(100) NOT NULL DEFAULT 'general',
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  message TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed')),
  transaction_id VARCHAR(255),
  tx_ref VARCHAR(255),
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  country VARCHAR(100),
  state VARCHAR(100),
  address TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donations_status ON donations (status);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations (created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_transaction_id ON donations (transaction_id) WHERE transaction_id IS NOT NULL;

-- ==================== PRAYER REQUESTS ====================
CREATE TABLE IF NOT EXISTS prayer_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  request_type VARCHAR(50) NOT NULL DEFAULT 'personal',
  request TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prayer_requests_created_at ON prayer_requests (created_at);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_request_type ON prayer_requests (request_type);

-- ==================== CONTACT MESSAGES ====================
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  subject VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages (created_at);

-- ==================== STORE ====================
CREATE TABLE IF NOT EXISTS store_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(500) NOT NULL,
  description TEXT,
  image VARCHAR(1000),
  category VARCHAR(100),
  price DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_products_category ON store_products (category);

CREATE TABLE IF NOT EXISTS store_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'cancelled')),
  total DECIMAL(12, 2),
  email VARCHAR(255),
  shipping_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES store_orders (id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES store_products (id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_orders_user_id ON store_orders (user_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_created_at ON store_orders (created_at);
CREATE INDEX IF NOT EXISTS idx_store_order_items_order_id ON store_order_items (order_id);

-- ==================== MEETINGS ====================
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  join_token VARCHAR(255) NOT NULL,
  room_name VARCHAR(255) NOT NULL,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Security: join_token is validated server-side; consider token expiry (e.g. join_token_expires_at) for time-limited links
CREATE UNIQUE INDEX IF NOT EXISTS idx_meetings_join_token ON meetings (join_token);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings (status);
CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON meetings (start_time);

CREATE TABLE IF NOT EXISTS meeting_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES meetings (id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_invitations_meeting_id ON meeting_invitations (meeting_id);

-- ==================== PAYMENTS (gateway intents / verification) ====================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  gateway VARCHAR(50) NOT NULL,
  donation_type VARCHAR(100),
  name VARCHAR(255),
  email VARCHAR(255),
  reference VARCHAR(255),
  client_secret VARCHAR(500),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments (reference);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments (created_at);

-- ==================== LIVE STREAM (optional config / cache) ====================
CREATE TABLE IF NOT EXISTS live_stream_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id VARCHAR(255),
  is_live BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== SOCIAL AUTOMATION ====================
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  link VARCHAR(1000),
  image_url VARCHAR(1000),
  platforms JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'posted', 'failed')),
  scheduled_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled_at ON social_posts (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts (status);

-- ==================== UPDATED_AT TRIGGERS ====================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_users ON users;
CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_sermons ON sermons;
CREATE TRIGGER set_updated_at_sermons BEFORE UPDATE ON sermons FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_events ON events;
CREATE TRIGGER set_updated_at_events BEFORE UPDATE ON events FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_blog_posts ON blog_posts;
CREATE TRIGGER set_updated_at_blog_posts BEFORE UPDATE ON blog_posts FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_devotionals ON devotionals;
CREATE TRIGGER set_updated_at_devotionals BEFORE UPDATE ON devotionals FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_donations ON donations;
CREATE TRIGGER set_updated_at_donations BEFORE UPDATE ON donations FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_store_products ON store_products;
CREATE TRIGGER set_updated_at_store_products BEFORE UPDATE ON store_products FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_store_orders ON store_orders;
CREATE TRIGGER set_updated_at_store_orders BEFORE UPDATE ON store_orders FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_meetings ON meetings;
CREATE TRIGGER set_updated_at_meetings BEFORE UPDATE ON meetings FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_payments ON payments;
CREATE TRIGGER set_updated_at_payments BEFORE UPDATE ON payments FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_social_posts ON social_posts;
CREATE TRIGGER set_updated_at_social_posts BEFORE UPDATE ON social_posts FOR EACH ROW EXECUTE PROCEDURE set_updated_at();