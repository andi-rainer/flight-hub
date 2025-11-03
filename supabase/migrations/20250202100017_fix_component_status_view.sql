-- =====================================================
-- FIX AIRCRAFT COMPONENTS VIEW
-- =====================================================
-- Fixes the aircraft_components_with_status view to:
-- 1. Return tbo_status instead of status_color (field name mismatch)
-- 2. Add percentage_used field (100 - percent_remaining)
-- 3. Fix status check to work with 'active' status
-- =====================================================

-- Drop and recreate the view (can't change column order with CREATE OR REPLACE)
DROP VIEW IF EXISTS public.aircraft_components_with_status;

CREATE VIEW public.aircraft_components_with_status AS
SELECT
    c.*,
    p.tail_number,
    totals.total_flight_hours AS aircraft_total_hours,
    -- Component hours calculation
    (totals.total_flight_hours - c.hours_at_installation + c.component_hours_offset) AS component_current_hours,
    -- Remaining hours
    (c.tbo_hours - (totals.total_flight_hours - c.hours_at_installation + c.component_hours_offset)) AS hours_remaining,
    -- Percentage remaining
    CASE
        WHEN c.tbo_hours > 0 THEN
            ((c.tbo_hours - (totals.total_flight_hours - c.hours_at_installation + c.component_hours_offset)) / c.tbo_hours * 100)
        ELSE 0
    END AS percent_remaining,
    -- Percentage used (for progress bar)
    CASE
        WHEN c.tbo_hours > 0 THEN
            ((totals.total_flight_hours - c.hours_at_installation + c.component_hours_offset) / c.tbo_hours * 100)
        ELSE 0
    END AS percentage_used,
    -- TBO Status for UI (renamed from status_color, fixed status check for 'active')
    CASE
        WHEN c.status NOT IN ('active', 'installed') THEN 'inactive'
        WHEN (c.tbo_hours - (totals.total_flight_hours - c.hours_at_installation + c.component_hours_offset)) <= 0 THEN 'overdue'
        WHEN (c.tbo_hours - (totals.total_flight_hours - c.hours_at_installation + c.component_hours_offset)) <= 50 THEN 'critical'
        WHEN (c.tbo_hours - (totals.total_flight_hours - c.hours_at_installation + c.component_hours_offset)) <= 100 THEN 'warning'
        WHEN (c.tbo_hours - (totals.total_flight_hours - c.hours_at_installation + c.component_hours_offset)) <= 200 THEN 'attention'
        ELSE 'ok'
    END AS tbo_status,
    -- Keep status_color for backwards compatibility
    CASE
        WHEN c.status NOT IN ('active', 'installed') THEN 'gray'
        WHEN (c.tbo_hours - (totals.total_flight_hours - c.hours_at_installation + c.component_hours_offset)) <= 0 THEN 'red'
        WHEN (c.tbo_hours - (totals.total_flight_hours - c.hours_at_installation + c.component_hours_offset)) <= 50 THEN 'orange'
        WHEN (c.tbo_hours - (totals.total_flight_hours - c.hours_at_installation + c.component_hours_offset)) <= 100 THEN 'yellow'
        ELSE 'green'
    END AS status_color
FROM public.aircraft_components c
JOIN public.planes p ON c.plane_id = p.id
LEFT JOIN public.aircraft_totals totals ON p.id = totals.id;

COMMENT ON VIEW public.aircraft_components_with_status IS 'Aircraft components with calculated hours, remaining TBO, percentage used, and status indicators';
