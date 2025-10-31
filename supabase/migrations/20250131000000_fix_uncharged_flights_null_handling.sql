-- Fix uncharged_flights view to properly handle NULL landing_time/takeoff_time
-- When these are NULL, the calculation returns NULL instead of 0, causing display issues

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
    f.passengers,
    f.icao_departure,
    f.icao_destination,
    f.m_and_b_pdf_url,
    f.locked,
    f.charged,
    f.created_at,
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
    ot.rate AS operation_rate,
    ot.default_cost_center_id,
    cc.name AS default_cost_center_name,
    -- Time calculations
    EXTRACT(EPOCH FROM (f.block_on - f.block_off)) / 3600.0 AS block_time_hours,
    CASE
        WHEN f.landing_time IS NOT NULL AND f.takeoff_time IS NOT NULL THEN
            EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 3600.0
        ELSE NULL
    END AS flight_time_hours,
    -- Flight amount calculation (based on billing unit and rate) - handles NULL gracefully
    CASE
        WHEN f.landing_time IS NULL OR f.takeoff_time IS NULL THEN 0
        WHEN p.billing_unit = 'minute' THEN
            (EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 60.0) * COALESCE(ot.rate, p.default_rate, 0)
        ELSE
            (EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 3600.0) * COALESCE(ot.rate, p.default_rate, 0)
    END AS flight_amount,
    -- Airport fees calculation using aircraft-specific fees
    COALESCE(
        -- Departure airport approach fee (for this specific aircraft)
        (
            SELECT aaf.approach_fee
            FROM public.airports a
            JOIN public.aircraft_airport_fees aaf ON aaf.airport_id = a.id
            WHERE a.icao_code = f.icao_departure
            AND aaf.plane_id = f.plane_id
            LIMIT 1
        ), 0
    ) +
    COALESCE(
        -- Destination airport landing fee (multiplied by landings, for this specific aircraft)
        (
            SELECT aaf.landing_fee * f.landings
            FROM public.airports a
            JOIN public.aircraft_airport_fees aaf ON aaf.airport_id = a.id
            WHERE a.icao_code = f.icao_destination
            AND aaf.plane_id = f.plane_id
            LIMIT 1
        ), 0
    ) +
    COALESCE(
        -- Destination airport approach fee (only if different from departure, for this specific aircraft)
        CASE
            WHEN f.icao_destination IS DISTINCT FROM f.icao_departure THEN
                (
                    SELECT aaf.approach_fee
                    FROM public.airports a
                    JOIN public.aircraft_airport_fees aaf ON aaf.airport_id = a.id
                    WHERE a.icao_code = f.icao_destination
                    AND aaf.plane_id = f.plane_id
                    LIMIT 1
                )
            ELSE 0
        END, 0
    ) +
    COALESCE(
        -- Destination airport parking fee (for this specific aircraft)
        (
            SELECT aaf.parking_fee
            FROM public.airports a
            JOIN public.aircraft_airport_fees aaf ON aaf.airport_id = a.id
            WHERE a.icao_code = f.icao_destination
            AND aaf.plane_id = f.plane_id
            LIMIT 1
        ), 0
    ) +
    COALESCE(
        -- Destination airport noise fee (for this specific aircraft)
        (
            SELECT aaf.noise_fee
            FROM public.airports a
            JOIN public.aircraft_airport_fees aaf ON aaf.airport_id = a.id
            WHERE a.icao_code = f.icao_destination
            AND aaf.plane_id = f.plane_id
            LIMIT 1
        ), 0
    ) +
    COALESCE(
        -- Destination airport passenger fees (passenger_fee * number of passengers, for this specific aircraft)
        (
            SELECT aaf.passenger_fee * f.passengers
            FROM public.airports a
            JOIN public.aircraft_airport_fees aaf ON aaf.airport_id = a.id
            WHERE a.icao_code = f.icao_destination
            AND aaf.plane_id = f.plane_id
            LIMIT 1
        ), 0
    ) AS airport_fees,
    -- Total calculated amount (flight + airport fees with aircraft-specific pricing) - handles NULL gracefully
    (
        CASE
            WHEN f.landing_time IS NULL OR f.takeoff_time IS NULL THEN 0
            WHEN p.billing_unit = 'minute' THEN
                (EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 60.0) * COALESCE(ot.rate, p.default_rate, 0)
            ELSE
                (EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 3600.0) * COALESCE(ot.rate, p.default_rate, 0)
        END
    ) +
    COALESCE(
        (
            SELECT aaf.approach_fee
            FROM public.airports a
            JOIN public.aircraft_airport_fees aaf ON aaf.airport_id = a.id
            WHERE a.icao_code = f.icao_departure
            AND aaf.plane_id = f.plane_id
            LIMIT 1
        ), 0
    ) +
    COALESCE(
        (
            SELECT aaf.landing_fee * f.landings
            FROM public.airports a
            JOIN public.aircraft_airport_fees aaf ON aaf.airport_id = a.id
            WHERE a.icao_code = f.icao_destination
            AND aaf.plane_id = f.plane_id
            LIMIT 1
        ), 0
    ) +
    COALESCE(
        CASE
            WHEN f.icao_destination IS DISTINCT FROM f.icao_departure THEN
                (
                    SELECT aaf.approach_fee
                    FROM public.airports a
                    JOIN public.aircraft_airport_fees aaf ON aaf.airport_id = a.id
                    WHERE a.icao_code = f.icao_destination
                    AND aaf.plane_id = f.plane_id
                    LIMIT 1
                )
            ELSE 0
        END, 0
    ) +
    COALESCE(
        (
            SELECT aaf.parking_fee
            FROM public.airports a
            JOIN public.aircraft_airport_fees aaf ON aaf.airport_id = a.id
            WHERE a.icao_code = f.icao_destination
            AND aaf.plane_id = f.plane_id
            LIMIT 1
        ), 0
    ) +
    COALESCE(
        (
            SELECT aaf.noise_fee
            FROM public.airports a
            JOIN public.aircraft_airport_fees aaf ON aaf.airport_id = a.id
            WHERE a.icao_code = f.icao_destination
            AND aaf.plane_id = f.plane_id
            LIMIT 1
        ), 0
    ) +
    COALESCE(
        (
            SELECT aaf.passenger_fee * f.passengers
            FROM public.airports a
            JOIN public.aircraft_airport_fees aaf ON aaf.airport_id = a.id
            WHERE a.icao_code = f.icao_destination
            AND aaf.plane_id = f.plane_id
            LIMIT 1
        ), 0
    ) AS calculated_amount
FROM public.flightlog f
JOIN public.planes p ON f.plane_id = p.id
JOIN public.users pilot ON f.pilot_id = pilot.id
LEFT JOIN public.users copilot ON f.copilot_id = copilot.id
LEFT JOIN public.operation_types ot ON f.operation_type_id = ot.id
LEFT JOIN public.cost_centers cc ON ot.default_cost_center_id = cc.id
WHERE f.charged = false AND f.locked = false
ORDER BY f.block_off DESC;

COMMENT ON VIEW public.uncharged_flights IS 'All uncharged and unlocked flights with calculated billing amounts (flight time + aircraft-specific airport fees including noise and passenger fees). Airport fees are automatically applied based on aircraft-specific fee configurations. Handles NULL landing/takeoff times gracefully.';

GRANT SELECT ON public.uncharged_flights TO authenticated;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
