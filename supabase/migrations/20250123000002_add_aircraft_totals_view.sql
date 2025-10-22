-- Create a view to show aircraft with their total flight hours and landings
-- This includes the initial offset values plus all logged flights

CREATE OR REPLACE VIEW aircraft_totals AS
SELECT
  p.id,
  p.tail_number,
  p.type,
  p.active,
  p.initial_flight_hours,
  p.initial_landings,
  COALESCE(SUM(EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 3600.0), 0) as logged_flight_hours,
  COALESCE(COUNT(f.id), 0)::INTEGER as logged_landings,
  (p.initial_flight_hours + COALESCE(SUM(EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 3600.0), 0)) as total_flight_hours,
  (p.initial_landings + COALESCE(COUNT(f.id), 0)::INTEGER) as total_landings
FROM planes p
LEFT JOIN flightlog f ON f.plane_id = p.id
GROUP BY p.id, p.tail_number, p.type, p.active, p.initial_flight_hours, p.initial_landings
ORDER BY p.tail_number;

-- Add comment
COMMENT ON VIEW aircraft_totals IS 'View showing aircraft with total flight hours and landings including initial offsets';
