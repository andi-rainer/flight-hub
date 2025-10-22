-- Add initial flight hours and landings offset fields to planes table
-- These allow tracking total hours/landings for aircraft that weren't brand new when added to the system

ALTER TABLE planes
ADD COLUMN IF NOT EXISTS initial_flight_hours NUMERIC(10, 2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS initial_landings INTEGER DEFAULT 0 NOT NULL;

-- Add comments
COMMENT ON COLUMN planes.initial_flight_hours IS 'Initial flight hours offset for aircraft (for planes that were not brand new when added to system)';
COMMENT ON COLUMN planes.initial_landings IS 'Initial landings offset for aircraft (for planes that were not brand new when added to system)';
