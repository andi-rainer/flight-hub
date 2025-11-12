-- Add notes field to flightlog table for treasurer comments
-- This allows pilots and board members to leave notes for the treasurer about billing

ALTER TABLE flightlog
ADD COLUMN notes TEXT;

-- Add comment to the column
COMMENT ON COLUMN flightlog.notes IS 'Optional notes/comments for the treasurer about this flight (e.g., special billing instructions, split payments, etc.)';
