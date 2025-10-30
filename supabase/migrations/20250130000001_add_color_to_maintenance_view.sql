-- Update aircraft_with_maintenance view to include color column from planes table
DROP VIEW IF EXISTS aircraft_with_maintenance CASCADE;

CREATE VIEW aircraft_with_maintenance AS
SELECT
  at.*,
  p.color,
  p.next_maintenance_hours,
  p.maintenance_interval_hours,
  CASE
    WHEN p.next_maintenance_hours IS NULL THEN NULL
    ELSE (p.next_maintenance_hours - at.total_flight_hours)
  END as hours_until_maintenance,
  CASE
    WHEN p.next_maintenance_hours IS NULL THEN 'not_scheduled'
    WHEN (p.next_maintenance_hours - at.total_flight_hours) < 0 THEN 'overdue'
    WHEN (p.next_maintenance_hours - at.total_flight_hours) <= 5 THEN 'critical'
    WHEN (p.next_maintenance_hours - at.total_flight_hours) <= 10 THEN 'warning'
    ELSE 'ok'
  END as maintenance_status,
  (
    SELECT json_build_object(
      'id', mr.id,
      'performed_at', mr.performed_at,
      'performed_at_hours', mr.performed_at_hours,
      'maintenance_type', mr.maintenance_type,
      'description', mr.description,
      'performed_by', mr.performed_by,
      'cost', mr.cost
    )
    FROM maintenance_records mr
    WHERE mr.plane_id = p.id
    ORDER BY mr.performed_at DESC
    LIMIT 1
  ) as last_maintenance
FROM aircraft_totals at
JOIN planes p ON p.id = at.id;

COMMENT ON VIEW aircraft_with_maintenance IS 'Aircraft with real-time maintenance status calculated from total flight hours, includes color column';

-- Force schema reload
NOTIFY pgrst, 'reload schema';
