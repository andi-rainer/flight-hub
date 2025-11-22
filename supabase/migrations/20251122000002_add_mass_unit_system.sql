-- Add mass unit system to aircraft
-- Allows switching between kg and lbs with automatic conversion

-- ============================================================================
-- 1. Add mass_unit column to planes table
-- ============================================================================

ALTER TABLE planes
ADD COLUMN IF NOT EXISTS mass_unit TEXT NOT NULL DEFAULT 'kg' CHECK (mass_unit IN ('kg', 'lbs'));

COMMENT ON COLUMN planes.mass_unit IS 'Unit system for all mass measurements (kg or lbs). Affects MTOM, empty_weight, CG limits, and station weights.';

-- Set default to 'kg' for all existing aircraft
UPDATE planes SET mass_unit = 'kg' WHERE mass_unit IS NULL;
