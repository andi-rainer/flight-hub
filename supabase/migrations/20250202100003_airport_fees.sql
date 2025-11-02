-- =====================================================
-- AIRPORT FEES SYSTEM
-- =====================================================
-- This migration creates the airport fees system with aircraft-specific fees
--
-- Consolidated from:
-- - 20250124000001_create_airport_fees.sql
-- - 20250124000002_add_airport_fees_to_uncharged_flights.sql
-- - 20250124000003_add_airport_fee_tiers.sql (table renamed)
-- - 20250124000004_update_uncharged_flights_with_tiers.sql
-- - 20250124000005_aircraft_specific_airport_fees.sql
-- - 20250124000006_update_uncharged_flights_aircraft_fees.sql
-- - 20250131000000_fix_uncharged_flights_null_handling.sql
--
-- NOTE: Skips intermediate MTOW-based tier approach and goes straight to
-- aircraft-specific fees which is the final desired state.
--
-- =====================================================
-- 1. AIRPORTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.airports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    icao_code VARCHAR(4) NOT NULL UNIQUE,
    airport_name TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT airports_icao_code_length CHECK (LENGTH(icao_code) = 4)
);

CREATE INDEX idx_airports_icao_code ON public.airports(icao_code);

COMMENT ON TABLE public.airports IS 'Airport master data with ICAO codes';
COMMENT ON COLUMN public.airports.icao_code IS '4-letter ICAO airport identifier';

-- =====================================================
-- 2. AIRCRAFT-SPECIFIC AIRPORT FEES TABLE
-- =====================================================
-- Allows different fee structures per aircraft at each airport

CREATE TABLE IF NOT EXISTS public.aircraft_airport_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    airport_id UUID NOT NULL REFERENCES public.airports(id) ON DELETE CASCADE,
    plane_id UUID NOT NULL REFERENCES public.planes(id) ON DELETE CASCADE,

    -- Fee components
    landing_fee NUMERIC(10, 2) DEFAULT 0.00,
    approach_fee NUMERIC(10, 2) DEFAULT 0.00,
    parking_fee NUMERIC(10, 2) DEFAULT 0.00,
    noise_fee NUMERIC(10, 2) DEFAULT 0.00,
    passenger_fee NUMERIC(10, 2) DEFAULT 0.00,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_airport_plane_fee UNIQUE (airport_id, plane_id)
);

CREATE INDEX idx_aircraft_airport_fees_airport_id ON public.aircraft_airport_fees(airport_id);
CREATE INDEX idx_aircraft_airport_fees_plane_id ON public.aircraft_airport_fees(plane_id);

COMMENT ON TABLE public.aircraft_airport_fees IS 'Airport fees specific to each aircraft';
COMMENT ON COLUMN public.aircraft_airport_fees.landing_fee IS 'Landing fee for this aircraft at this airport';
COMMENT ON COLUMN public.aircraft_airport_fees.approach_fee IS 'Approach/navigation fee';
COMMENT ON COLUMN public.aircraft_airport_fees.parking_fee IS 'Parking fee (if applicable)';
COMMENT ON COLUMN public.aircraft_airport_fees.noise_fee IS 'Noise pollution fee';
COMMENT ON COLUMN public.aircraft_airport_fees.passenger_fee IS 'Per-passenger fee (multiplied by passenger count)';

-- =====================================================
-- 3. HELPER VIEWS FOR FEES
-- =====================================================

-- View to get aircraft totals (referenced in maintenance system)
CREATE OR REPLACE VIEW public.aircraft_totals AS
SELECT
    p.id,
    p.tail_number,
    p.type,
    p.active,
    p.initial_flight_hours,
    p.initial_landings,
    -- Calculate total flight hours from logs
    COALESCE(p.initial_flight_hours, 0) +
    COALESCE(SUM(EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 3600.0), 0) AS total_flight_hours,
    -- Calculate total landings
    COALESCE(p.initial_landings, 0) +
    COALESCE(SUM(f.landings), 0) AS total_landings,
    -- Latest flight
    MAX(f.block_on) AS last_flight_date
FROM public.planes p
LEFT JOIN public.flightlog f ON p.id = f.plane_id
GROUP BY p.id, p.tail_number, p.type, p.active, p.initial_flight_hours, p.initial_landings;

COMMENT ON VIEW public.aircraft_totals IS 'Aircraft with calculated total hours and landings from initial values + flight logs';

-- =====================================================
-- 4. UPDATE FLIGHTLOG_WITH_TIMES VIEW
-- =====================================================
-- Update to include ICAO codes, landings, needs_board_review

DROP VIEW IF EXISTS public.flightlog_with_times;

CREATE VIEW public.flightlog_with_times AS
SELECT
    f.*,
    public.calculate_block_time(f.block_off, f.block_on) AS block_time_hours,
    public.calculate_flight_time(f.takeoff_time, f.landing_time) AS flight_time_hours,
    p.tail_number,
    p.type AS plane_type,
    pilot.name AS pilot_name,
    pilot.surname AS pilot_surname,
    copilot.name AS copilot_name,
    copilot.surname AS copilot_surname,
    ot.name AS operation_type_name,
    ot.color AS operation_type_color
FROM public.flightlog f
JOIN public.planes p ON f.plane_id = p.id
JOIN public.users pilot ON f.pilot_id = pilot.id
LEFT JOIN public.users copilot ON f.copilot_id = copilot.id
LEFT JOIN public.operation_types ot ON f.operation_type_id = ot.id;

COMMENT ON VIEW public.flightlog_with_times IS 'Flightlog entries with calculated times and full details including operation types';

-- =====================================================
-- 5. UPDATE UNCHARGED FLIGHTS VIEW WITH FEE CALCULATIONS
-- =====================================================
-- This is the final version with aircraft-specific fees and proper NULL handling

DROP VIEW IF EXISTS public.uncharged_flights;

CREATE VIEW public.uncharged_flights AS
SELECT
    f.id,
    f.plane_id,
    f.pilot_id,
    f.copilot_id,
    f.operation_type_id,
    f.block_off,
    f.block_on,
    f.takeoff_time,
    f.landing_time,
    f.fuel,
    f.oil,
    f.landings,
    f.m_and_b_pdf_url,
    f.locked,
    f.charged,
    f.needs_board_review,
    f.created_at,
    f.icao_departure,
    f.icao_destination,
    f.passengers,
    -- Aircraft info
    p.tail_number,
    p.type AS plane_type,
    p.billing_unit,
    p.default_rate AS plane_default_rate,
    p.passenger_seats,
    -- Pilot info
    pilot.name AS pilot_name,
    pilot.surname AS pilot_surname,
    pilot.email AS pilot_email,
    -- Copilot info
    copilot.name AS copilot_name,
    copilot.surname AS copilot_surname,
    -- Operation type info
    ot.name AS operation_type_name,
    ot.color AS operation_type_color,
    ot.rate AS operation_rate,
    ot.default_cost_center_id,
    cc.name AS default_cost_center_name,
    -- Airport info
    dep_airport.airport_name AS departure_airport_name,
    dest_airport.airport_name AS destination_airport_name,
    -- Time calculations (with NULL handling)
    COALESCE(public.calculate_block_time(f.block_off, f.block_on), 0) AS block_time_hours,
    COALESCE(public.calculate_flight_time(f.takeoff_time, f.landing_time), 0) AS flight_time_hours,
    -- Flight amount calculation (uses FLIGHT TIME, not block time)
    COALESCE(
        CASE
            WHEN p.billing_unit = 'minute' THEN
                (EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 60.0) * COALESCE(ot.rate, p.default_rate, 0)
            ELSE
                (EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 3600.0) * COALESCE(ot.rate, p.default_rate, 0)
        END,
        0
    ) AS flight_amount,
    -- Departure airport fees (aircraft-specific)
    COALESCE(dep_fees.landing_fee, 0) AS departure_landing_fee,
    COALESCE(dep_fees.approach_fee, 0) AS departure_approach_fee,
    COALESCE(dep_fees.parking_fee, 0) AS departure_parking_fee,
    COALESCE(dep_fees.noise_fee, 0) AS departure_noise_fee,
    COALESCE(dep_fees.passenger_fee * COALESCE(f.passengers, 0), 0) AS departure_passenger_fee,
    COALESCE(
        dep_fees.landing_fee +
        dep_fees.approach_fee +
        dep_fees.parking_fee +
        dep_fees.noise_fee +
        (dep_fees.passenger_fee * COALESCE(f.passengers, 0)),
        0
    ) AS departure_total_fees,
    -- Destination airport fees (aircraft-specific)
    COALESCE(dest_fees.landing_fee, 0) AS destination_landing_fee,
    COALESCE(dest_fees.approach_fee, 0) AS destination_approach_fee,
    COALESCE(dest_fees.parking_fee, 0) AS destination_parking_fee,
    COALESCE(dest_fees.noise_fee, 0) AS destination_noise_fee,
    COALESCE(dest_fees.passenger_fee * COALESCE(f.passengers, 0), 0) AS destination_passenger_fee,
    COALESCE(
        dest_fees.landing_fee +
        dest_fees.approach_fee +
        dest_fees.parking_fee +
        dest_fees.noise_fee +
        (dest_fees.passenger_fee * COALESCE(f.passengers, 0)),
        0
    ) AS destination_total_fees,
    -- Total calculated amount (flight + all fees)
    COALESCE(
        CASE
            WHEN p.billing_unit = 'minute' THEN
                (EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 60.0) * COALESCE(ot.rate, p.default_rate, 0)
            ELSE
                (EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 3600.0) * COALESCE(ot.rate, p.default_rate, 0)
        END,
        0
    ) +
    -- Departure fees
    COALESCE(
        dep_fees.landing_fee +
        dep_fees.approach_fee +
        dep_fees.parking_fee +
        dep_fees.noise_fee +
        (dep_fees.passenger_fee * COALESCE(f.passengers, 0)),
        0
    ) +
    -- Destination fees
    COALESCE(
        dest_fees.landing_fee +
        dest_fees.approach_fee +
        dest_fees.parking_fee +
        dest_fees.noise_fee +
        (dest_fees.passenger_fee * COALESCE(f.passengers, 0)),
        0
    ) AS calculated_amount

FROM public.flightlog f
JOIN public.planes p ON f.plane_id = p.id
JOIN public.users pilot ON f.pilot_id = pilot.id
LEFT JOIN public.users copilot ON f.copilot_id = copilot.id
LEFT JOIN public.operation_types ot ON f.operation_type_id = ot.id
LEFT JOIN public.cost_centers cc ON ot.default_cost_center_id = cc.id
-- Airport lookups
LEFT JOIN public.airports dep_airport ON f.icao_departure = dep_airport.icao_code
LEFT JOIN public.airports dest_airport ON f.icao_destination = dest_airport.icao_code
-- Aircraft-specific fee lookups
LEFT JOIN public.aircraft_airport_fees dep_fees ON dep_airport.id = dep_fees.airport_id AND f.plane_id = dep_fees.plane_id
LEFT JOIN public.aircraft_airport_fees dest_fees ON dest_airport.id = dest_fees.airport_id AND f.plane_id = dest_fees.plane_id
WHERE f.charged = false AND f.locked = false
ORDER BY f.block_off DESC;

COMMENT ON VIEW public.uncharged_flights IS 'All uncharged and unlocked flights with calculated billing amounts using FLIGHT TIME and aircraft-specific airport fees';

-- =====================================================
-- 6. TRIGGERS
-- =====================================================

CREATE TRIGGER update_airports_updated_at
    BEFORE UPDATE ON public.airports
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_aircraft_airport_fees_updated_at
    BEFORE UPDATE ON public.aircraft_airport_fees
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 7. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.airports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aircraft_airport_fees ENABLE ROW LEVEL SECURITY;

-- Airports: All authenticated users can read
CREATE POLICY "Airports viewable by authenticated users"
    ON public.airports FOR SELECT
    TO authenticated
    USING (true);

-- Airports: Board can manage
CREATE POLICY "Board can manage airports"
    ON public.airports FOR ALL
    TO authenticated
    USING (public.is_board_member(auth.uid()))
    WITH CHECK (public.is_board_member(auth.uid()));

-- Aircraft Airport Fees: All authenticated users can read
CREATE POLICY "Aircraft airport fees viewable by authenticated users"
    ON public.aircraft_airport_fees FOR SELECT
    TO authenticated
    USING (true);

-- Aircraft Airport Fees: Board can manage
CREATE POLICY "Board can manage aircraft airport fees"
    ON public.aircraft_airport_fees FOR ALL
    TO authenticated
    USING (public.is_board_member(auth.uid()))
    WITH CHECK (public.is_board_member(auth.uid()));

-- =====================================================
-- 8. SEED DATA: COMMON AUSTRIAN AIRPORTS
-- =====================================================

INSERT INTO public.airports (icao_code, airport_name, notes) VALUES
    ('LOWW', 'Vienna International Airport', 'Main international airport'),
    ('LOWS', 'Salzburg Airport', 'Major regional airport'),
    ('LOWI', 'Innsbruck Airport', 'Alpine airport'),
    ('LOWG', 'Graz Airport', 'Regional airport'),
    ('LOWK', 'Klagenfurt Airport', 'Carinthian airport'),
    ('LOWL', 'Linz Airport', 'Upper Austrian airport'),
    ('LOXL', 'Linz-Hörsching Air Base', 'Military and general aviation'),
    ('LOAN', 'Wiener Neustadt East Airport', 'General aviation'),
    ('LOKW', 'Wels Airport', 'General aviation'),
    ('LOLW', 'Wels-Flugplatz', 'Small general aviation')
ON CONFLICT (icao_code) DO NOTHING;
