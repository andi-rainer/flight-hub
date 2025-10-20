-- Force complete schema reload for notifications table
-- This ensures PostgREST recognizes all columns

-- Verify all required columns exist
DO $$
BEGIN
  -- Ensure title column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'title'
  ) THEN
    ALTER TABLE notifications ADD COLUMN title text NOT NULL DEFAULT 'Notification';
  END IF;

  -- Ensure message column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'message'
  ) THEN
    ALTER TABLE notifications ADD COLUMN message text NOT NULL DEFAULT '';
  END IF;

  -- Ensure link column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'link'
  ) THEN
    ALTER TABLE notifications ADD COLUMN link text;
  END IF;

  -- Ensure document_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'document_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN document_id uuid REFERENCES documents(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update the type check constraint to include all notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'document_uploaded',
    'document_approved',
    'document_rejected',
    'document_expiring',
    'reservation_active',
    'general'
  ));

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_document_id ON notifications(document_id);

-- Force PostgREST to completely reload the schema
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Add updated comment
COMMENT ON TABLE notifications IS 'Stores user notifications - schema reloaded 2025-01-20';
