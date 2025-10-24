-- Update uncharged_flights view to use MTOW-based tiered airport fees
-- This replaces the simple fee lookup with tier-based fee calculation

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
    p.max_mass AS plane_mtow_kg,
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
    EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 3600.0 AS flight_time_hours,
    -- Flight amount calculation (based on billing unit and rate)
    CASE
        WHEN p.billing_unit = 'minute' THEN
            (EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 60.0) * COALESCE(ot.rate, p.default_rate, 0)
        ELSE
            (EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 3600.0) * COALESCE(ot.rate, p.default_rate, 0)
    END AS flight_amount,
    -- Airport fees calculation using tiered pricing based on MTOW
    COALESCE(
        -- Departure airport approach fee (select tier based on plane MTOW)
        (
            SELECT aft.approach_fee
            FROM public.airports a
            JOIN public.airport_fee_tiers aft ON aft.airport_id = a.id
            WHERE a.icao_code = f.icao_departure
            AND aft.min_mtow_kg <= COALESCE(p.max_mass, 0)
            AND (aft.max_mtow_kg IS NULL OR COALESCE(p.max_mass, 0) < aft.max_mtow_kg)
            LIMIT 1
        ), 0
    ) +
    COALESCE(
        -- Destination airport landing fee (multiplied by landings, tier based on MTOW)
        (
            SELECT aft.landing_fee * f.landings
            FROM public.airports a
            JOIN public.airport_fee_tiers aft ON aft.airport_id = a.id
            WHERE a.icao_code = f.icao_destination
            AND aft.min_mtow_kg <= COALESCE(p.max_mass, 0)
            AND (aft.max_mtow_kg IS NULL OR COALESCE(p.max_mass, 0) < aft.max_mtow_kg)
            LIMIT 1
        ), 0
    ) +
    COALESCE(
        -- Destination airport approach fee (only if different from departure, tier based on MTOW)
        CASE
            WHEN f.icao_destination IS DISTINCT FROM f.icao_departure THEN
                (
                    SELECT aft.approach_fee
                    FROM public.airports a
                    JOIN public.airport_fee_tiers aft ON aft.airport_id = a.id
                    WHERE a.icao_code = f.icao_destination
                    AND aft.min_mtow_kg <= COALESCE(p.max_mass, 0)
                    AND (aft.max_mtow_kg IS NULL OR COALESCE(p.max_mass, 0) < aft.max_mtow_kg)
                    LIMIT 1
                )
            ELSE 0
        END, 0
    ) +
    COALESCE(
        -- Destination airport parking fee (tier based on MTOW)
        (
            SELECT aft.parking_fee
            FROM public.airports a
            JOIN public.airport_fee_tiers aft ON aft.airport_id = a.id
            WHERE a.icao_code = f.icao_destination
            AND aft.min_mtow_kg <= COALESCE(p.max_mass, 0)
            AND (aft.max_mtow_kg IS NULL OR COALESCE(p.max_mass, 0) < aft.max_mtow_kg)
            LIMIT 1
        ), 0
    ) AS airport_fees,
    -- Total calculated amount (flight + airport fees with tiered pricing)
    (
        CASE
            WHEN p.billing_unit = 'minute' THEN
                (EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 60.0) * COALESCE(ot.rate, p.default_rate, 0)
            ELSE
                (EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 3600.0) * COALESCE(ot.rate, p.default_rate, 0)
        END
    ) +
    COALESCE(
        (
            SELECT aft.approach_fee
            FROM public.airports a
            JOIN public.airport_fee_tiers aft ON aft.airport_id = a.id
            WHERE a.icao_code = f.icao_departure
            AND aft.min_mtow_kg <= COALESCE(p.max_mass, 0)
            AND (aft.max_mtow_kg IS NULL OR COALESCE(p.max_mass, 0) < aft.max_mtow_kg)
            LIMIT 1
        ), 0
    ) +
    COALESCE(
        (
            SELECT aft.landing_fee * f.landings
            FROM public.airports a
            JOIN public.airport_fee_tiers aft ON aft.airport_id = a.id
            WHERE a.icao_code = f.icao_destination
            AND aft.min_mtow_kg <= COALESCE(p.max_mass, 0)
            AND (aft.max_mtow_kg IS NULL OR COALESCE(p.max_mass, 0) < aft.max_mtow_kg)
            LIMIT 1
        ), 0
    ) +
    COALESCE(
        CASE
            WHEN f.icao_destination IS DISTINCT FROM f.icao_departure THEN
                (
                    SELECT aft.approach_fee
                    FROM public.airports a
                    JOIN public.airport_fee_tiers aft ON aft.airport_id = a.id
                    WHERE a.icao_code = f.icao_destination
                    AND aft.min_mtow_kg <= COALESCE(p.max_mass, 0)
                    AND (aft.max_mtow_kg IS NULL OR COALESCE(p.max_mass, 0) < aft.max_mtow_kg)
                    LIMIT 1
                )
            ELSE 0
        END, 0
    ) +
    COALESCE(
        (
            SELECT aft.parking_fee
            FROM public.airports a
            JOIN public.airport_fee_tiers aft ON aft.airport_id = a.id
            WHERE a.icao_code = f.icao_destination
            AND aft.min_mtow_kg <= COALESCE(p.max_mass, 0)
            AND (aft.max_mtow_kg IS NULL OR COALESCE(p.max_mass, 0) < aft.max_mtow_kg)
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

COMMENT ON VIEW public.uncharged_flights IS 'All uncharged and unlocked flights with calculated billing amounts (flight time + MTOW-based tiered airport fees). Airport fees are automatically selected based on aircraft MTOW.';

GRANT SELECT ON public.uncharged_flights TO authenticated;
