-- Fix notifications table schema and ensure it's properly configured
-- This migration ensures the notifications table has all required columns

-- Add link column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'link'
  ) THEN
    ALTER TABLE notifications ADD COLUMN link text;
  END IF;
END $$;

-- Ensure document_id column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'document_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN document_id uuid REFERENCES documents(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure all required indexes exist
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_document_id ON notifications(document_id);

-- Force PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';

-- Add comment
COMMENT ON TABLE notifications IS 'Stores user notifications for document approvals and other events - schema updated';
