-- Brands table for cannabis producers/brands
CREATE TABLE brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  normalized_name text NOT NULL, -- Lowercase, normalized for matching
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_brands_name ON brands(name);
CREATE UNIQUE INDEX idx_brands_normalized_name ON brands(normalized_name);
CREATE INDEX idx_brands_name_lower ON brands(lower(name));

-- Add brand_id to deals table
ALTER TABLE deals ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES brands(id) ON DELETE SET NULL;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS product_name text; -- Product name without brand (e.g., "1g carts" from "STIIIZY 1g carts")

CREATE INDEX idx_deals_brand_id ON deals(brand_id);
CREATE INDEX idx_deals_brand_date ON deals(brand_id, date) WHERE brand_id IS NOT NULL;

-- Add brands array to preferences table
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS brands text[] DEFAULT '{}';

CREATE INDEX idx_preferences_brands ON preferences USING GIN(brands);

-- RLS Policies
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read brands" ON brands FOR SELECT USING (true);
CREATE POLICY "Service role manages brands" ON brands FOR ALL USING (true);
