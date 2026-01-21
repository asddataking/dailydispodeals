-- 004_ocr_caching.sql
-- Add OCR result caching and metadata to deal_flyers

ALTER TABLE deal_flyers 
ADD COLUMN IF NOT EXISTS ocr_text TEXT,
ADD COLUMN IF NOT EXISTS ocr_text_hash TEXT,
ADD COLUMN IF NOT EXISTS ocr_processed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_deal_flyers_ocr_hash 
ON deal_flyers(ocr_text_hash);

