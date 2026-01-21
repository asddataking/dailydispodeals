-- Dispensaries table for tracking dispensaries and their locations
CREATE TABLE dispensaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text,
  zip text,
  state text DEFAULT 'MI',
  latitude numeric,
  longitude numeric,
  weedmaps_url text,
  flyer_url text, -- Where to fetch daily flyer
  active boolean DEFAULT true,
  last_ingested_at timestamptz,
  ingestion_success_rate numeric DEFAULT 1.0, -- Track reliability (0.0 to 1.0)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_dispensaries_name ON dispensaries(name);
CREATE INDEX idx_dispensaries_zip ON dispensaries(zip);
CREATE INDEX idx_dispensaries_active ON dispensaries(active) WHERE active = true;
CREATE INDEX idx_dispensaries_location ON dispensaries(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Enhance deals table with quality assurance fields
ALTER TABLE deals ADD COLUMN IF NOT EXISTS confidence numeric;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS reviewed_by text; -- admin email or 'auto'
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deal_hash text; -- For duplicate detection

CREATE INDEX IF NOT EXISTS idx_deals_confidence ON deals(confidence);
CREATE INDEX IF NOT EXISTS idx_deals_needs_review ON deals(needs_review) WHERE needs_review = true;
CREATE INDEX IF NOT EXISTS idx_deals_hash ON deals(deal_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_deals_duplicate ON deals(dispensary_name, date, deal_hash) WHERE deal_hash IS NOT NULL;

-- Deal review queue table
CREATE TABLE deal_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
  reason text, -- 'low_confidence', 'duplicate_suspected', 'unusual_price', 'category_mismatch', etc.
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'fixed')),
  reviewed_at timestamptz,
  reviewed_by text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_deal_reviews_status ON deal_reviews(status) WHERE status = 'pending';
CREATE INDEX idx_deal_reviews_deal_id ON deal_reviews(deal_id);

-- RLS Policies
ALTER TABLE dispensaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active dispensaries" ON dispensaries FOR SELECT USING (active = true);
CREATE POLICY "Service role manages dispensaries" ON dispensaries FOR ALL USING (true);
CREATE POLICY "Service role manages deal_reviews" ON deal_reviews FOR ALL USING (true);
