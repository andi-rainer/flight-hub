-- Add landings field to flightlog table to track number of landings per flight
-- Useful for touch-and-go training flights

ALTER TABLE flightlog
ADD COLUMN IF NOT EXISTS landings INTEGER DEFAULT 1 NOT NULL;

-- Add comment
COMMENT ON COLUMN flightlog.landings IS 'Number of landings for this flight (e.g., 1 for normal flight, multiple for touch-and-go training)';
