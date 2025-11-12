-- Update uncharged_flights view to include notes field
-- This allows notes/comments to be displayed in billing interface

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
    f.notes,
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

COMMENT ON VIEW public.uncharged_flights IS 'All uncharged and unlocked flights with calculated billing amounts using FLIGHT TIME and aircraft-specific airport fees. Includes notes field for treasurer comments.';
