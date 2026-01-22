-- Migration: Sync users table with auth.users
-- This migration links users.id to auth.users.id so RLS policies work correctly

-- Step 1: Create a temporary table to store existing users
CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users;

-- Step 2: Drop foreign key constraints that reference users.id
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
ALTER TABLE preferences DROP CONSTRAINT IF EXISTS preferences_user_id_fkey;
ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_user_id_fkey;

-- Step 3: Drop the users table
DROP TABLE IF EXISTS users CASCADE;

-- Step 4: Recreate users table with id that references auth.users.id
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_users_email ON users(email);

-- Step 5: Recreate foreign key constraints
ALTER TABLE subscriptions 
  ADD CONSTRAINT subscriptions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE preferences 
  ADD CONSTRAINT preferences_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE email_logs 
  ADD CONSTRAINT email_logs_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 6: Migrate existing users (if any)
-- For each user in backup, create auth user if doesn't exist, then insert into users
-- Note: This requires a function that can be called to sync existing users
-- For now, we'll handle this in application code if needed

-- Step 7: Clean up backup table (optional - can keep for safety)
-- DROP TABLE IF EXISTS users_backup;

-- RLS policies should now work correctly since users.id = auth.users.id
-- The existing policies in 001_initial_schema.sql will work:
-- CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid()::text = id::text);
