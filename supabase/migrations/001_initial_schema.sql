-- Users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_users_email ON users(email);

-- Subscriptions table
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  plan text NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  status text NOT NULL,
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE UNIQUE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status) WHERE status = 'active';

-- Preferences table
CREATE TABLE preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  categories text[] NOT NULL DEFAULT '{}',
  zip text,
  radius int CHECK (radius IN (5, 10, 25)),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_preferences_user_id ON preferences(user_id);
CREATE INDEX idx_preferences_categories ON preferences USING GIN(categories);

-- Deals table
CREATE TABLE deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispensary_name text NOT NULL,
  city text,
  date date NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  price_text text NOT NULL,
  source_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_deals_date ON deals(date);
CREATE INDEX idx_deals_category ON deals(category);
CREATE INDEX idx_deals_date_category ON deals(date, category);

-- Email logs table
CREATE TABLE email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  sent_at timestamptz DEFAULT now(),
  status text NOT NULL CHECK (status IN ('sent', 'failed')),
  error text
);

CREATE INDEX idx_email_logs_user_date ON email_logs(user_id, date);
CREATE UNIQUE INDEX idx_email_logs_user_date_unique ON email_logs(user_id, date) WHERE status = 'sent';

-- Deal flyers table
CREATE TABLE deal_flyers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispensary_name text NOT NULL,
  date date NOT NULL,
  file_path text NOT NULL,
  source_url text NOT NULL,
  hash text NOT NULL,
  processed_at timestamptz,
  deals_extracted int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_deal_flyers_date ON deal_flyers(date);
CREATE INDEX idx_deal_flyers_dispensary_date ON deal_flyers(dispensary_name, date);
CREATE UNIQUE INDEX idx_deal_flyers_hash_date ON deal_flyers(hash, date);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_flyers ENABLE ROW LEVEL SECURITY;

-- RLS Policies (service role bypasses via SERVICE_ROLE_KEY)
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can read own subscriptions" ON subscriptions FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can read own preferences" ON preferences FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Public can read active deals" ON deals FOR SELECT USING (true);
CREATE POLICY "Service role manages deal_flyers" ON deal_flyers FOR ALL USING (true);
