-- 005_zone_ingestion.sql
-- Zone-based ingestion flow: zones, user_subscriptions, zone_dispensaries, notifications_outbox

-- Zones table: deduped geographic areas by ZIP
CREATE TABLE zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zip text UNIQUE NOT NULL,
  status text DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'PAUSED')),
  last_processed_at timestamptz,
  next_process_at timestamptz,
  ttl_minutes int DEFAULT 360, -- 6 hours default
  processing_lock text,
  processing_lock_expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_zones_zip ON zones(zip);
CREATE INDEX idx_zones_next_process_at ON zones(next_process_at) WHERE status = 'ACTIVE';
CREATE INDEX idx_zones_processing_lock ON zones(processing_lock_expires_at) WHERE processing_lock IS NOT NULL;

-- User subscriptions: email + zone_id (separate from Stripe subscriptions)
CREATE TABLE user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  zone_id uuid REFERENCES zones(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_user_subscriptions_email_zone ON user_subscriptions(email, zone_id);
CREATE INDEX idx_user_subscriptions_zone_id ON user_subscriptions(zone_id);
CREATE INDEX idx_user_subscriptions_email ON user_subscriptions(email);

-- Zone-dispensary join table: which dispensaries serve which zones
CREATE TABLE zone_dispensaries (
  zone_id uuid REFERENCES zones(id) ON DELETE CASCADE NOT NULL,
  dispensary_id uuid REFERENCES dispensaries(id) ON DELETE CASCADE NOT NULL,
  last_seen_at timestamptz DEFAULT now(),
  PRIMARY KEY (zone_id, dispensary_id)
);

CREATE INDEX idx_zone_dispensaries_zone_id ON zone_dispensaries(zone_id);
CREATE INDEX idx_zone_dispensaries_dispensary_id ON zone_dispensaries(dispensary_id);

-- Notifications outbox: queue for email sending (WELCOME, DEALS_READY)
CREATE TABLE notifications_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  zone_id uuid REFERENCES zones(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('WELCOME', 'DEALS_READY')),
  status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_notifications_outbox_unique ON notifications_outbox(email, zone_id, type);
CREATE INDEX idx_notifications_outbox_status ON notifications_outbox(status) WHERE status = 'PENDING';
CREATE INDEX idx_notifications_outbox_zone_id ON notifications_outbox(zone_id);

-- Extend dispensaries table with Google Places data and website info
ALTER TABLE dispensaries 
ADD COLUMN IF NOT EXISTS place_id text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS deals_url text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS address text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dispensaries_place_id ON dispensaries(place_id) WHERE place_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dispensaries_website ON dispensaries(website) WHERE website IS NOT NULL;

-- RLS Policies
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_dispensaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages zones" ON zones FOR ALL USING (true);
CREATE POLICY "Service role manages user_subscriptions" ON user_subscriptions FOR ALL USING (true);
CREATE POLICY "Service role manages zone_dispensaries" ON zone_dispensaries FOR ALL USING (true);
CREATE POLICY "Service role manages notifications_outbox" ON notifications_outbox FOR ALL USING (true);
