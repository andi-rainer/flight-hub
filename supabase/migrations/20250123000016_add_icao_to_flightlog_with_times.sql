-- Update flightlog_with_times view to include ICAO departure and destination

DROP VIEW IF EXISTS public.flightlog_with_times;

CREATE VIEW public.flightlog_with_times AS
SELECT
    f.id,
    f.plane_id,
    f.pilot_id,
    f.copilot_id,
    f.block_on,
    f.block_off,
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
    f.operation_type_id,
    f.created_at,
    f.updated_at,
    EXTRACT(EPOCH FROM (f.block_on - f.block_off)) / 3600.0 as block_time_hours,
    EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 3600.0 as flight_time_hours,
    p.tail_number,
    p.type as plane_type,
    pilot.name as pilot_name,
    pilot.surname as pilot_surname,
    copilot.name as copilot_name,
    copilot.surname as copilot_surname,
    ot.name as operation_type_name,
    ot.color as operation_type_color,
    ot.rate as operation_rate,
    p.billing_unit
FROM public.flightlog f
JOIN public.planes p ON f.plane_id = p.id
JOIN public.users pilot ON f.pilot_id = pilot.id
LEFT JOIN public.users copilot ON f.copilot_id = copilot.id
LEFT JOIN public.operation_types ot ON f.operation_type_id = ot.id;

GRANT SELECT ON public.flightlog_with_times TO authenticated;
