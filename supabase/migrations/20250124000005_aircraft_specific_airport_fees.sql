-- Replace MTOW-based tiers with aircraft-specific airport fees
-- Add passenger tracking to planes and flightlog

-- Step 1: Drop the old tiered system
DROP TABLE IF EXISTS public.airport_fee_tiers CASCADE;

-- Step 2: Add passenger_seats to planes table
ALTER TABLE public.planes
  ADD COLUMN IF NOT EXISTS passenger_seats INTEGER DEFAULT 0;

COMMENT ON COLUMN public.planes.passenger_seats IS 'Number of passenger seats (excluding pilot seats)';

-- Step 3: Add passengers to flightlog table
ALTER TABLE public.flightlog
  ADD COLUMN IF NOT EXISTS passengers INTEGER DEFAULT 0;

COMMENT ON COLUMN public.flightlog.passengers IS 'Number of passengers on this flight (excluding pilot and copilot)';

-- Step 4: Create aircraft_airport_fees table (per-aircraft, per-airport fees)
CREATE TABLE IF NOT EXISTS public.aircraft_airport_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    airport_id UUID NOT NULL REFERENCES public.airports(id) ON DELETE CASCADE,
    plane_id UUID NOT NULL REFERENCES public.planes(id) ON DELETE CASCADE,
    landing_fee NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    approach_fee NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    parking_fee NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    noise_fee NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    passenger_fee NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one fee configuration per aircraft per airport
    CONSTRAINT unique_aircraft_airport UNIQUE (airport_id, plane_id)
);

CREATE INDEX idx_aircraft_airport_fees_airport ON public.aircraft_airport_fees(airport_id);
CREATE INDEX idx_aircraft_airport_fees_plane ON public.aircraft_airport_fees(plane_id);

CREATE TRIGGER update_aircraft_airport_fees_updated_at
    BEFORE UPDATE ON public.aircraft_airport_fees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.aircraft_airport_fees IS 'Aircraft-specific fees per airport. Fees are configured per plane per airport, with noise fees and per-passenger fees.';
COMMENT ON COLUMN public.aircraft_airport_fees.landing_fee IS 'Landing fee per landing for this aircraft at this airport';
COMMENT ON COLUMN public.aircraft_airport_fees.approach_fee IS 'Approach fee per approach for this aircraft at this airport';
COMMENT ON COLUMN public.aircraft_airport_fees.parking_fee IS 'Parking fee per flight for this aircraft at this airport';
COMMENT ON COLUMN public.aircraft_airport_fees.noise_fee IS 'Noise fee per flight for this aircraft at this airport';
COMMENT ON COLUMN public.aircraft_airport_fees.passenger_fee IS 'Fee per passenger for this aircraft at this airport';

-- RLS Policies for aircraft_airport_fees
ALTER TABLE public.aircraft_airport_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow board members to insert aircraft airport fees"
ON public.aircraft_airport_fees
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND 'board' = ANY(users.role)
    )
);

CREATE POLICY "Allow board members to update aircraft airport fees"
ON public.aircraft_airport_fees
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND 'board' = ANY(users.role)
    )
);

CREATE POLICY "Allow board members to delete aircraft airport fees"
ON public.aircraft_airport_fees
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND 'board' = ANY(users.role)
    )
);

CREATE POLICY "Allow authenticated users to view aircraft airport fees"
ON public.aircraft_airport_fees
FOR SELECT
TO authenticated
USING (true);

GRANT SELECT ON public.aircraft_airport_fees TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.aircraft_airport_fees TO authenticated;
