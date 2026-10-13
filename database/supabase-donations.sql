-- Supabase schema for Flutterwave V4 donations (run in Supabase SQL Editor)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS donation_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO donation_types (code, name, is_active) VALUES
  ('general', 'General Donation', TRUE),
  ('missions', 'Missions', TRUE),
  ('building', 'Building Fund', TRUE),
  ('youth', 'Youth Ministry', TRUE),
  ('outreach', 'Community Outreach', TRUE)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  donor_name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  phone VARCHAR(40),
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
  donation_type VARCHAR(80) NOT NULL,
  message TEXT,
  tx_ref VARCHAR(42) NOT NULL UNIQUE,
  flutterwave_transaction_id VARCHAR(255),
  payment_method VARCHAR(50) NOT NULL DEFAULT 'flutterwave',
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'successful', 'verified', 'failed', 'cancelled')),
  verification_attempts INTEGER NOT NULL DEFAULT 0,
  verified_at TIMESTAMPTZ,
  failure_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  webhook_received_at TIMESTAMPTZ,
  webhook_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donations_status ON donations (status);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_email ON donations (email);

CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  donation_id UUID NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'flutterwave',
  provider_transaction_id VARCHAR(255),
  status VARCHAR(50),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_donation_id ON payment_events (donation_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_created_at ON payment_events (created_at DESC);

DROP TRIGGER IF EXISTS set_updated_at_donation_types ON donation_types;
CREATE TRIGGER set_updated_at_donation_types
  BEFORE UPDATE ON donation_types
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_donations ON donations;
CREATE TRIGGER set_updated_at_donations
  BEFORE UPDATE ON donations
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
