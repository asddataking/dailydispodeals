-- 009_subscriptions_free_plan.sql
-- Add 'free' plan for freemium: weekly summary by zip, no Stripe, no preferences (categories/brands).

-- Drop the existing plan CHECK and add one that includes 'free'
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check CHECK (plan IN ('monthly', 'yearly', 'free'));
