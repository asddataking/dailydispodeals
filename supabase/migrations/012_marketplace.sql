-- Marketplace rebuild: extend deals, public submit, affiliates, placements, newsletter

-- Deals: marketplace fields
ALTER TABLE deals ADD COLUMN IF NOT EXISTS dispensary_id uuid REFERENCES dispensaries(id) ON DELETE SET NULL;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS regular_price text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deal_price text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS image text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS menu_url text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS state text DEFAULT 'MI';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS sponsored boolean DEFAULT false;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS submission_source text DEFAULT 'ingest';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS status text DEFAULT 'approved';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE deals ADD COLUMN IF NOT EXISTS view_count int DEFAULT 0;

UPDATE deals SET start_date = date WHERE start_date IS NULL;
UPDATE deals SET end_date = date + 1 WHERE end_date IS NULL;
UPDATE deals SET slug = lower(regexp_replace(coalesce(title, 'deal') || '-' || left(id::text, 8), '[^a-z0-9]+', '-', 'g')) WHERE slug IS NULL;
UPDATE deals SET status = CASE WHEN needs_review = true THEN 'pending' ELSE coalesce(status, 'approved') END;
UPDATE deals SET state = 'MI' WHERE state IS NULL;
UPDATE deals SET menu_url = source_url WHERE menu_url IS NULL AND source_url IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_deals_slug ON deals(slug);
CREATE INDEX IF NOT EXISTS idx_deals_status_end ON deals(status, end_date);
CREATE INDEX IF NOT EXISTS idx_deals_city ON deals(city);
CREATE INDEX IF NOT EXISTS idx_deals_featured ON deals(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_deals_dispensary_id ON deals(dispensary_id);

-- Dispensary public profile fields
ALTER TABLE dispensaries ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE dispensaries ADD COLUMN IF NOT EXISTS logo text;
ALTER TABLE dispensaries ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;
ALTER TABLE dispensaries ADD COLUMN IF NOT EXISTS claimed boolean DEFAULT false;
ALTER TABLE dispensaries ADD COLUMN IF NOT EXISTS menu_url text;

UPDATE dispensaries
SET slug = lower(regexp_replace(coalesce(name, 'dispensary') || '-' || coalesce(city, 'mi'), '[^a-z0-9]+', '-', 'g'))
WHERE slug IS NULL;

UPDATE dispensaries SET menu_url = coalesce(menu_url, website, deals_url, weedmaps_url);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dispensaries_slug ON dispensaries(slug);

-- Cities
CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  state text DEFAULT 'MI',
  intro text,
  nearby text[] DEFAULT '{}',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read cities" ON cities;
CREATE POLICY "Public can read cities" ON cities FOR SELECT USING (active = true);

INSERT INTO cities (slug, name, intro, nearby) VALUES
  ('detroit', 'Detroit', 'Detroit shoppers should not have to open ten menus to find out what is actually on special tonight.', ARRAY['ann-arbor','flint','lansing']),
  ('ann-arbor', 'Ann Arbor', 'Ann Arbor has plenty of dispensaries and not enough time to hunt through every board.', ARRAY['detroit','lansing']),
  ('port-huron', 'Port Huron', 'Port Huron cannabis shoppers can check today’s flower, cart and edible specials in one place.', ARRAY['detroit','flint']),
  ('grand-rapids', 'Grand Rapids', 'West Michigan deals, minus the scavenger hunt.', ARRAY['lansing','kalamazoo']),
  ('lansing', 'Lansing', 'Capital-region shoppers can compare today’s dispensary specials without bouncing between apps.', ARRAY['ann-arbor','grand-rapids','flint']),
  ('flint', 'Flint', 'Flint and Genesee County specials belong in one feed, not ten Instagram stories.', ARRAY['detroit','lansing','saginaw']),
  ('kalamazoo', 'Kalamazoo', 'Kalamazoo shoppers can skip the menu crawl.', ARRAY['grand-rapids','lansing']),
  ('royal-oak', 'Royal Oak', 'Royal Oak and the greater Woodward corridor specials, submitted by shops.', ARRAY['detroit','ferndale']),
  ('ferndale', 'Ferndale', 'Ferndale’s compact dispensary scene, with current specials in one place.', ARRAY['royal-oak','detroit']),
  ('saginaw', 'Saginaw', 'Saginaw-area cannabis deals submitted by local dispensaries.', ARRAY['flint','lansing'])
ON CONFLICT (slug) DO NOTHING;

-- Deal submissions
CREATE TABLE IF NOT EXISTS deal_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  dispensary_name text NOT NULL,
  city text,
  contact_email text,
  payload jsonb NOT NULL DEFAULT '{}',
  flyer_path text,
  extracted jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text
);

CREATE INDEX IF NOT EXISTS idx_deal_submissions_status ON deal_submissions(status);
ALTER TABLE deal_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages submissions" ON deal_submissions;
CREATE POLICY "Service role manages submissions" ON deal_submissions FOR ALL USING (true);

-- Clicks / views
CREATE TABLE IF NOT EXISTS deal_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
  source text DEFAULT 'click',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_clicks_deal ON deal_clicks(deal_id, created_at);
ALTER TABLE deal_clicks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages clicks" ON deal_clicks;
CREATE POLICY "Service role manages clicks" ON deal_clicks FOR ALL USING (true);

-- Affiliate catalog
CREATE TABLE IF NOT EXISTS affiliate_categories (
  slug text PRIMARY KEY,
  name text NOT NULL,
  headline text,
  description text,
  sort_order int DEFAULT 0
);

CREATE TABLE IF NOT EXISTS affiliate_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  blurb text,
  category_slug text REFERENCES affiliate_categories(slug),
  image text,
  url text NOT NULL,
  discount text,
  featured boolean DEFAULT false,
  active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE affiliate_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read affiliate categories" ON affiliate_categories;
DROP POLICY IF EXISTS "Public read affiliate products" ON affiliate_products;
CREATE POLICY "Public read affiliate categories" ON affiliate_categories FOR SELECT USING (true);
CREATE POLICY "Public read affiliate products" ON affiliate_products FOR SELECT USING (active = true);

INSERT INTO affiliate_categories (slug, name, headline, description, sort_order) VALUES
  ('storage', 'Storage', 'Keep It Fresh', 'Humidity-control products and storage.', 1),
  ('grinders', 'Grinders', 'Grind It', 'Grinders and preparation accessories.', 2),
  ('humidity-control', 'Humidity Control', 'Keep It Fresh', 'Humidity packs for flower.', 3),
  ('smell-proof-storage', 'Smell-Proof Storage', 'Stash It', 'Smell-resistant bags, jars and cases.', 4),
  ('cleaning', 'Cleaning', 'Keep It Clean', 'Glass and accessory cleaning products.', 5),
  ('grow', 'Grow Gear', 'Grow Gear', 'Lighting, environment and accessories.', 6)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO affiliate_products (name, slug, blurb, category_slug, url, discount, featured, sort_order) VALUES
  ('Humidity Pack 2-Way Control', 'humidity-pack-2-way', 'Keep flower at a stable humidity without babysitting the jar.', 'humidity-control', 'https://www.amazon.com/s?k=humidity+pack+cannabis', NULL, true, 1),
  ('Smell-Proof Stash Bag', 'smell-proof-stash-bag', 'Odor-resistant everyday carry for flower and accessories.', 'smell-proof-storage', 'https://www.amazon.com/s?k=smell+proof+stash+bag', NULL, true, 2),
  ('Four-Piece Grinder', 'four-piece-grinder', 'A solid daily grinder with a kief catcher.', 'grinders', 'https://www.amazon.com/s?k=herb+grinder+4+piece', NULL, true, 3),
  ('Glass & Accessory Cleaner', 'glass-accessory-cleaner', 'Strip resin without wrecking your glass.', 'cleaning', 'https://www.amazon.com/s?k=glass+pipe+cleaner', NULL, true, 4)
ON CONFLICT (slug) DO NOTHING;

-- Sponsored placements
CREATE TABLE IF NOT EXISTS sponsored_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('featured_deal', 'featured_dispensary', 'city_sponsor', 'brand')),
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  dispensary_id uuid REFERENCES dispensaries(id) ON DELETE SET NULL,
  city_slug text,
  brand_name text,
  start_date date,
  end_date date,
  price_snapshot numeric,
  active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sponsored_placements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active placements" ON sponsored_placements;
CREATE POLICY "Public read active placements" ON sponsored_placements FOR SELECT USING (active = true);

-- Site settings
CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read site settings" ON site_settings;
CREATE POLICY "Public read site settings" ON site_settings FOR SELECT USING (true);

INSERT INTO site_settings (key, value) VALUES
  ('placement_prices', '{"featured_deal_per_day": 15, "featured_dispensary_per_month": 99, "city_sponsor_per_month": 249}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Newsletter (free)
CREATE TABLE IF NOT EXISTS newsletter_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  zip text,
  categories text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_signups(email);
ALTER TABLE newsletter_signups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages newsletter" ON newsletter_signups;
CREATE POLICY "Service role manages newsletter" ON newsletter_signups FOR ALL USING (true);

-- Profile claim requests
CREATE TABLE IF NOT EXISTS profile_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispensary_id uuid REFERENCES dispensaries(id) ON DELETE CASCADE,
  dispensary_slug text,
  email text NOT NULL,
  proof text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profile_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages claims" ON profile_claims;
CREATE POLICY "Service role manages claims" ON profile_claims FOR ALL USING (true);

-- Advertise inquiries
CREATE TABLE IF NOT EXISTS advertise_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text NOT NULL,
  business text,
  interest text,
  message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE advertise_inquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages inquiries" ON advertise_inquiries;
CREATE POLICY "Service role manages inquiries" ON advertise_inquiries FOR ALL USING (true);
