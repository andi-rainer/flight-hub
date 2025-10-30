-- Add needs_board_review column to flightlog table
ALTER TABLE flightlog
ADD COLUMN IF NOT EXISTS needs_board_review boolean NOT NULL DEFAULT false;

-- Add flightlog_id reference to notifications table (for linking flight entries)
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS flightlog_id uuid REFERENCES flightlog(id) ON DELETE CASCADE;

-- Update notification type enum to include flight log warnings
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  'document_uploaded',
  'document_approved',
  'document_rejected',
  'document_expiring',
  'flight_location_disconnect',
  'flight_overlap',
  'flight_warning'
));

-- Create index for faster queries on needs_board_review
CREATE INDEX IF NOT EXISTS idx_flightlog_needs_board_review ON flightlog(needs_board_review) WHERE needs_board_review = true;

-- Create index for flightlog_id in notifications
CREATE INDEX IF NOT EXISTS idx_notifications_flightlog_id ON notifications(flightlog_id);

-- Add comment
COMMENT ON COLUMN flightlog.needs_board_review IS 'Flag indicating this flight entry has warnings and needs board review';
COMMENT ON COLUMN notifications.flightlog_id IS 'Reference to flightlog entry for flight-related notifications';

-- Force schema reload
NOTIFY pgrst, 'reload schema';
