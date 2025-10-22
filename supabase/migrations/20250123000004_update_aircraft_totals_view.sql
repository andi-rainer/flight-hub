-- Update aircraft_totals view to sum landings instead of counting flights
-- This accounts for flights with multiple landings (e.g., touch-and-go)

CREATE OR REPLACE VIEW aircraft_totals AS
SELECT
  p.id,
  p.tail_number,
  p.type,
  p.active,
  p.initial_flight_hours,
  p.initial_landings,
  COALESCE(SUM(EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 3600.0), 0) as logged_flight_hours,
  COALESCE(SUM(f.landings), 0)::INTEGER as logged_landings,
  (p.initial_flight_hours + COALESCE(SUM(EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 3600.0), 0)) as total_flight_hours,
  (p.initial_landings + COALESCE(SUM(f.landings), 0)::INTEGER) as total_landings
FROM planes p
LEFT JOIN flightlog f ON f.plane_id = p.id
GROUP BY p.id, p.tail_number, p.type, p.active, p.initial_flight_hours, p.initial_landings
ORDER BY p.tail_number;

-- Add comment
COMMENT ON VIEW aircraft_totals IS 'View showing aircraft with total flight hours and landings including initial offsets. Landings are summed to account for multiple landings per flight (e.g., touch-and-go).';
