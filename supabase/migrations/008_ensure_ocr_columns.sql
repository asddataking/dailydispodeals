-- 008_ensure_ocr_columns.sql
-- Ensure OCR caching columns exist on deal_flyers (idempotent; fixes "column ocr_processed_at does not exist" if 004 was not applied)

ALTER TABLE deal_flyers
  ADD COLUMN IF NOT EXISTS ocr_text TEXT,
  ADD COLUMN IF NOT EXISTS ocr_text_hash TEXT,
  ADD COLUMN IF NOT EXISTS ocr_processed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_deal_flyers_ocr_hash
  ON deal_flyers(ocr_text_hash);
