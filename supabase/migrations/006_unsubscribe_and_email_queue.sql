-- 006_unsubscribe_and_email_queue.sql
-- Add unsubscribe functionality and improve email queue handling

-- Add email_enabled flag to preferences (defaults to true for existing users)
ALTER TABLE preferences
ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_preferences_email_enabled ON preferences(email_enabled) WHERE email_enabled = true;

-- Add retry tracking to notifications_outbox
ALTER TABLE notifications_outbox
ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_attempted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS error_message TEXT;

CREATE INDEX IF NOT EXISTS idx_notifications_outbox_retry ON notifications_outbox(status, retry_count) WHERE status = 'PENDING';

-- Add sent_at timestamp for tracking
ALTER TABLE notifications_outbox
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
