-- Add high-THC and value-deals preferences for filtering/ranking
ALTER TABLE preferences
  ADD COLUMN IF NOT EXISTS prefer_high_thc boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS prefer_value_deals boolean DEFAULT false;

COMMENT ON COLUMN preferences.prefer_high_thc IS 'User prefers higher-THC products when we have that data';
COMMENT ON COLUMN preferences.prefer_value_deals IS 'User prefers budget/value-focused deals when ranking';
