-- 011_raw_deal_ingest.sql
-- Raw deal ingestion from external sources (e.g. Chrome extension)

CREATE TABLE raw_deal_ingest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  dispensary_name text NOT NULL,
  dispensary_url text,
  raw_text text,
  product_name text,
  price_text text,
  category_hint text,
  page_url text NOT NULL,
  captured_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  processed boolean DEFAULT false,
  processing_error text
);

-- Indexes to support downstream processing
CREATE INDEX idx_raw_deal_ingest_processed ON raw_deal_ingest(processed);
CREATE INDEX idx_raw_deal_ingest_created_at ON raw_deal_ingest(created_at);

-- Enable RLS; service role bypasses via SUPABASE_SERVICE_ROLE_KEY
ALTER TABLE raw_deal_ingest ENABLE ROW LEVEL SECURITY;

-- Allow service role (and trusted backends) to manage raw_deal_ingest
CREATE POLICY "Service role manages raw_deal_ingest"
  ON raw_deal_ingest
  FOR ALL
  USING (true);

