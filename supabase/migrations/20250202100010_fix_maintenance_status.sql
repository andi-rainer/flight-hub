-- =====================================================
-- FIX MAINTENANCE STATUS COLUMN
-- =====================================================
-- Add maintenance_status column to aircraft_with_maintenance view
-- that maps status colors to status names expected by the application

DROP VIEW IF EXISTS public.aircraft_with_maintenance;

CREATE VIEW public.aircraft_with_maintenance AS
SELECT
    p.*,
    totals.total_flight_hours,
    totals.total_landings,
    totals.last_flight_date,
    -- Next maintenance calculation
    CASE
        WHEN p.next_maintenance_hours IS NOT NULL THEN p.next_maintenance_hours
        WHEN p.maintenance_interval_hours IS NOT NULL THEN
            COALESCE(totals.total_flight_hours, 0) + p.maintenance_interval_hours
        ELSE NULL
    END AS calculated_next_maintenance_hours,
    -- Hours until next maintenance
    CASE
        WHEN p.next_maintenance_hours IS NOT NULL THEN
            p.next_maintenance_hours - COALESCE(totals.total_flight_hours, 0)
        WHEN p.maintenance_interval_hours IS NOT NULL THEN
            p.maintenance_interval_hours
        ELSE NULL
    END AS hours_until_maintenance,
    -- Status color for UI
    CASE
        WHEN p.next_maintenance_hours IS NOT NULL AND
             p.next_maintenance_hours - COALESCE(totals.total_flight_hours, 0) <= 0 THEN 'red'
        WHEN p.next_maintenance_hours IS NOT NULL AND
             p.next_maintenance_hours - COALESCE(totals.total_flight_hours, 0) <= 10 THEN 'orange'
        WHEN p.next_maintenance_hours IS NOT NULL AND
             p.next_maintenance_hours - COALESCE(totals.total_flight_hours, 0) <= 25 THEN 'yellow'
        ELSE 'green'
    END AS maintenance_status_color,
    -- Status name for application logic
    CASE
        WHEN p.next_maintenance_hours IS NULL THEN 'not_scheduled'
        WHEN p.next_maintenance_hours - COALESCE(totals.total_flight_hours, 0) <= 0 THEN 'overdue'
        WHEN p.next_maintenance_hours - COALESCE(totals.total_flight_hours, 0) <= 10 THEN 'critical'
        WHEN p.next_maintenance_hours - COALESCE(totals.total_flight_hours, 0) <= 25 THEN 'warning'
        ELSE 'ok'
    END AS maintenance_status,
    -- Last maintenance
    last_mx.performed_at AS last_maintenance_date,
    last_mx.maintenance_type AS last_maintenance_type,
    last_mx.description AS last_maintenance_description
FROM public.planes p
LEFT JOIN public.aircraft_totals totals ON p.id = totals.id
LEFT JOIN LATERAL (
    SELECT performed_at, maintenance_type, description
    FROM public.maintenance_records
    WHERE plane_id = p.id
    ORDER BY performed_at DESC
    LIMIT 1
) last_mx ON true;

COMMENT ON VIEW public.aircraft_with_maintenance IS 'Aircraft with maintenance status, hours until next maintenance, color coding, and status names';
