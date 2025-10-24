-- Add MTOW-based tiered pricing for airport fees
-- This migration restructures airport fees to support different pricing based on aircraft maximum take-off weight

-- Enable btree_gist extension for the exclusion constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Step 0: Drop the old uncharged_flights view first (it depends on the columns we're about to drop)
DROP VIEW IF EXISTS public.uncharged_flights;

-- Step 1: Rename airport_fees to airports (just store airport metadata)
ALTER TABLE IF EXISTS public.airport_fees RENAME TO airports;

-- Step 2: Remove fee columns from airports table (keep only metadata)
ALTER TABLE public.airports
  DROP COLUMN IF EXISTS landing_fee,
  DROP COLUMN IF EXISTS approach_fee,
  DROP COLUMN IF EXISTS parking_fee;

-- Step 3: Create airport_fee_tiers table for MTOW-based pricing
CREATE TABLE IF NOT EXISTS public.airport_fee_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    airport_id UUID NOT NULL REFERENCES public.airports(id) ON DELETE CASCADE,
    min_mtow_kg INTEGER NOT NULL DEFAULT 0,
    max_mtow_kg INTEGER, -- NULL means no upper limit
    landing_fee NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    approach_fee NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    parking_fee NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    tier_name TEXT, -- e.g., "Light Aircraft", "Medium Aircraft", "Heavy Aircraft"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure min < max when max is specified
    CONSTRAINT valid_mtow_range CHECK (max_mtow_kg IS NULL OR min_mtow_kg < max_mtow_kg),

    -- Ensure no overlapping ranges for the same airport
    CONSTRAINT no_overlapping_ranges EXCLUDE USING gist (
        airport_id WITH =,
        int4range(min_mtow_kg, COALESCE(max_mtow_kg, 2147483647), '[]') WITH &&
    )
);

-- Add index for efficient lookups
CREATE INDEX idx_airport_fee_tiers_airport_id ON public.airport_fee_tiers(airport_id);
CREATE INDEX idx_airport_fee_tiers_mtow_range ON public.airport_fee_tiers(min_mtow_kg, max_mtow_kg);

-- Add updated_at trigger
CREATE TRIGGER update_airport_fee_tiers_updated_at
    BEFORE UPDATE ON public.airport_fee_tiers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.airport_fee_tiers IS 'Airport fee tiers based on aircraft MTOW (Maximum Take-Off Weight). Fees are selected based on the aircraft max_mass falling within the tier range.';
COMMENT ON COLUMN public.airport_fee_tiers.min_mtow_kg IS 'Minimum MTOW in kg for this tier (inclusive)';
COMMENT ON COLUMN public.airport_fee_tiers.max_mtow_kg IS 'Maximum MTOW in kg for this tier (exclusive). NULL means no upper limit.';
COMMENT ON COLUMN public.airport_fee_tiers.landing_fee IS 'Landing fee per landing for aircraft in this MTOW range';
COMMENT ON COLUMN public.airport_fee_tiers.approach_fee IS 'Approach fee per approach for aircraft in this MTOW range';
COMMENT ON COLUMN public.airport_fee_tiers.parking_fee IS 'Parking fee per flight for aircraft in this MTOW range';

-- RLS Policies for airport_fee_tiers
ALTER TABLE public.airport_fee_tiers ENABLE ROW LEVEL SECURITY;

-- Board members can manage tiers
CREATE POLICY "Allow board members to insert airport fee tiers"
ON public.airport_fee_tiers
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND 'board' = ANY(users.role)
    )
);

CREATE POLICY "Allow board members to update airport fee tiers"
ON public.airport_fee_tiers
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND 'board' = ANY(users.role)
    )
);

CREATE POLICY "Allow board members to delete airport fee tiers"
ON public.airport_fee_tiers
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND 'board' = ANY(users.role)
    )
);

-- All authenticated users can view tiers
CREATE POLICY "Allow authenticated users to view airport fee tiers"
ON public.airport_fee_tiers
FOR SELECT
TO authenticated
USING (true);

GRANT SELECT ON public.airport_fee_tiers TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.airport_fee_tiers TO authenticated;
