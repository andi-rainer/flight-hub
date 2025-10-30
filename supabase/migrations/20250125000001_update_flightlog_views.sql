-- Drop and recreate flightlog_with_times view to include needs_board_review column
DROP VIEW IF EXISTS flightlog_with_times CASCADE;

CREATE VIEW flightlog_with_times AS
SELECT
  f.id,
  f.plane_id,
  f.pilot_id,
  f.copilot_id,
  f.operation_type_id,
  f.block_off,
  f.takeoff_time,
  f.landing_time,
  f.block_on,
  f.fuel,
  f.oil,
  f.landings,
  f.icao_departure,
  f.icao_destination,
  f.m_and_b_pdf_url,
  f.locked,
  f.charged,
  f.needs_board_review,
  f.created_at,
  f.updated_at,
  p.tail_number,
  p.type AS plane_type,
  p.billing_unit,
  pilot.name AS pilot_name,
  pilot.surname AS pilot_surname,
  copilot.name AS copilot_name,
  copilot.surname AS copilot_surname,
  ot.name AS operation_type_name,
  ot.color AS operation_type_color,
  ot.rate AS operation_rate,
  EXTRACT(EPOCH FROM (f.block_on - f.block_off)) / 3600.0 AS block_time_hours,
  EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 3600.0 AS flight_time_hours
FROM flightlog f
LEFT JOIN planes p ON f.plane_id = p.id
LEFT JOIN users pilot ON f.pilot_id = pilot.id
LEFT JOIN users copilot ON f.copilot_id = copilot.id
LEFT JOIN operation_types ot ON f.operation_type_id = ot.id;

-- Drop and recreate flightlog_with_operation_details view to include needs_board_review
DROP VIEW IF EXISTS flightlog_with_operation_details CASCADE;

CREATE VIEW flightlog_with_operation_details AS
SELECT
  f.id,
  f.plane_id,
  f.pilot_id,
  f.copilot_id,
  f.operation_type_id,
  f.block_off,
  f.takeoff_time,
  f.landing_time,
  f.block_on,
  f.fuel,
  f.oil,
  f.locked,
  f.charged,
  f.needs_board_review,
  f.m_and_b_pdf_url,
  f.created_at,
  f.updated_at,
  p.tail_number,
  p.type AS plane_type,
  p.billing_unit,
  pilot.name AS pilot_name,
  pilot.surname AS pilot_surname,
  copilot.name AS copilot_name,
  copilot.surname AS copilot_surname,
  ot.name AS operation_type_name,
  ot.rate AS operation_rate,
  EXTRACT(EPOCH FROM (f.block_on - f.block_off)) / 60.0 AS block_time_minutes,
  EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 60.0 AS flight_time_minutes,
  EXTRACT(EPOCH FROM (f.block_on - f.block_off)) / 3600.0 AS block_time_hours,
  EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 3600.0 AS flight_time_hours,
  CASE
    WHEN ot.rate IS NOT NULL AND ot.rate > 0 THEN
      (EXTRACT(EPOCH FROM (f.block_on - f.block_off)) / 3600.0) * ot.rate
    WHEN p.default_rate IS NOT NULL AND p.default_rate > 0 THEN
      (EXTRACT(EPOCH FROM (f.block_on - f.block_off)) / 3600.0) * p.default_rate
    ELSE NULL
  END AS calculated_billing_amount
FROM flightlog f
LEFT JOIN planes p ON f.plane_id = p.id
LEFT JOIN users pilot ON f.pilot_id = pilot.id
LEFT JOIN users copilot ON f.copilot_id = copilot.id
LEFT JOIN operation_types ot ON f.operation_type_id = ot.id;

-- Drop and recreate uncharged_flights view to include needs_board_review
DROP VIEW IF EXISTS uncharged_flights CASCADE;

CREATE VIEW uncharged_flights AS
SELECT
  f.id,
  f.plane_id,
  f.pilot_id,
  f.copilot_id,
  f.operation_type_id,
  f.block_off,
  f.takeoff_time,
  f.landing_time,
  f.block_on,
  f.fuel,
  f.oil,
  f.landings,
  f.icao_departure,
  f.icao_destination,
  f.m_and_b_pdf_url,
  f.locked,
  f.charged,
  f.needs_board_review,
  f.created_at,
  p.tail_number,
  p.type AS plane_type,
  p.billing_unit,
  p.default_rate AS plane_default_rate,
  pilot.name AS pilot_name,
  pilot.surname AS pilot_surname,
  pilot.email AS pilot_email,
  copilot.name AS copilot_name,
  copilot.surname AS copilot_surname,
  ot.name AS operation_type_name,
  ot.rate AS operation_rate,
  ot.default_cost_center_id,
  cc.name AS default_cost_center_name,
  EXTRACT(EPOCH FROM (f.block_on - f.block_off)) / 3600.0 AS block_time_hours,
  EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 3600.0 AS flight_time_hours,
  CASE
    WHEN ot.rate IS NOT NULL AND ot.rate > 0 THEN
      (EXTRACT(EPOCH FROM (f.block_on - f.block_off)) / 3600.0) * ot.rate
    WHEN p.default_rate IS NOT NULL AND p.default_rate > 0 THEN
      (EXTRACT(EPOCH FROM (f.block_on - f.block_off)) / 3600.0) * p.default_rate
    ELSE NULL
  END AS calculated_amount
FROM flightlog f
LEFT JOIN planes p ON f.plane_id = p.id
LEFT JOIN users pilot ON f.pilot_id = pilot.id
LEFT JOIN users copilot ON f.copilot_id = copilot.id
LEFT JOIN operation_types ot ON f.operation_type_id = ot.id
LEFT JOIN cost_centers cc ON ot.default_cost_center_id = cc.id
WHERE f.charged = false;

-- Add comment
COMMENT ON VIEW flightlog_with_times IS 'Flightlog entries with calculated times and needs_board_review flag';
COMMENT ON VIEW flightlog_with_operation_details IS 'Flightlog entries with operation details and needs_board_review flag';
COMMENT ON VIEW uncharged_flights IS 'Uncharged flightlog entries with billing information and needs_board_review flag';

-- Force schema reload
NOTIFY pgrst, 'reload schema';
