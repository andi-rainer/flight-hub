-- =====================================================
-- ADD TITLE FIELD TO NOTIFICATIONS TABLE
-- =====================================================
-- This field is required for displaying notification titles
-- in the dashboard notifications card
-- =====================================================

-- Add title field to notifications table
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS title TEXT;

-- Set a default title for existing notifications based on type
UPDATE public.notifications
SET title = CASE
  WHEN type = 'flight_warning' THEN 'Flight Entry Needs Review'
  WHEN type = 'document_expiring' THEN 'Document Expiring'
  WHEN type = 'document_uploaded' THEN 'Document Uploaded'
  WHEN type = 'document_approved' THEN 'Document Approved'
  WHEN type = 'reservation_active' THEN 'Reservation Active'
  ELSE 'Notification'
END
WHERE title IS NULL;

-- Make title NOT NULL now that existing records are updated
ALTER TABLE public.notifications
ALTER COLUMN title SET NOT NULL;

-- Set default value for future inserts
ALTER TABLE public.notifications
ALTER COLUMN title SET DEFAULT 'Notification';
