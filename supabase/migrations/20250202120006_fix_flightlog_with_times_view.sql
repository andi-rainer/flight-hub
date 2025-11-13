-- Fix flightlog_with_times view to include new split cost fields
-- The view uses f.* but was created before the new columns were added
-- Recreating it will pick up split_cost_with_copilot, pilot_cost_percentage, copilot_is_instructor

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

COMMENT ON VIEW public.flightlog_with_times IS 'Flightlog entries with calculated times and full details including operation types, notes, and cost splitting preferences.';
