-- Add skydive aircraft configuration to planes table
-- This migration adds support for configuring aircraft for skydive operations

-- Add max_jumpers column to track maximum jumper capacity
ALTER TABLE planes
ADD COLUMN max_jumpers INTEGER;

-- Add is_skydive_aircraft flag to identify aircraft used for skydiving
ALTER TABLE planes
ADD COLUMN is_skydive_aircraft BOOLEAN NOT NULL DEFAULT false;

-- Set is_skydive_aircraft = true for planes that have max_jumpers configured
UPDATE planes
SET is_skydive_aircraft = true
WHERE max_jumpers IS NOT NULL AND max_jumpers > 0;

-- Add constraint: non-skydive aircraft cannot have max_jumpers set
-- This ensures data integrity between the two fields
ALTER TABLE planes
ADD CONSTRAINT skydive_aircraft_max_jumpers_check
CHECK (
  (is_skydive_aircraft = false AND (max_jumpers IS NULL OR max_jumpers = 0))
  OR
  (is_skydive_aircraft = true AND max_jumpers > 0)
);

-- Add helpful comment
COMMENT ON COLUMN planes.max_jumpers IS 'Maximum number of jumpers that can be manifested on this aircraft (skydive operations only)';
COMMENT ON COLUMN planes.is_skydive_aircraft IS 'Indicates whether this aircraft is configured for skydive operations';
