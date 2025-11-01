-- Aircraft Components TBO Tracking System
-- Tracks life-limited components (engines, propellers, etc.) with Time Between Overhaul (TBO)

-- 1. Create component type enum
CREATE TYPE component_type AS ENUM (
  'engine',
  'propeller',
  'landing_gear',
  'constant_speed_unit',
  'magneto',
  'vacuum_pump',
  'alternator',
  'starter',
  'other'
);

-- 2. Create component status enum
CREATE TYPE component_status AS ENUM (
  'active',      -- Currently installed and in use
  'removed',     -- Removed from aircraft
  'overhauled',  -- Overhauled and reinstalled (creates new record)
  'scrapped'     -- Disposed/scrapped
);

-- 3. Create aircraft_components table
CREATE TABLE IF NOT EXISTS aircraft_components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plane_id UUID NOT NULL REFERENCES planes(id) ON DELETE CASCADE,

  -- Component identification
  component_type component_type NOT NULL,
  position TEXT,  -- 'left', 'right', 'center', '1', '2', etc. NULL for single components
  serial_number TEXT,
  manufacturer TEXT,
  model TEXT,
  part_number TEXT,

  -- TBO tracking
  tbo_hours NUMERIC(10, 2) NOT NULL,  -- Time Between Overhaul in hours
  hours_at_installation NUMERIC(10, 2) NOT NULL DEFAULT 0,  -- Aircraft hours when component was installed
  component_hours_offset NUMERIC(10, 2) NOT NULL DEFAULT 0,  -- Component's own hours at installation (for used/overhauled components)

  -- Installation tracking
  installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  installed_by UUID REFERENCES users(id),

  -- Status
  status component_status NOT NULL DEFAULT 'active',
  removed_at TIMESTAMPTZ,
  removed_by UUID REFERENCES users(id),
  removal_reason TEXT,

  -- Link to maintenance record (if installed/removed via MX event)
  installation_mx_record_id UUID REFERENCES maintenance_records(id),
  removal_mx_record_id UUID REFERENCES maintenance_records(id),

  -- Notes
  notes TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id)
);

COMMENT ON TABLE aircraft_components IS 'Tracks life-limited aircraft components with TBO (Time Between Overhaul)';
COMMENT ON COLUMN aircraft_components.tbo_hours IS 'Time Between Overhaul - maximum hours before component must be overhauled';
COMMENT ON COLUMN aircraft_components.hours_at_installation IS 'Aircraft total hours when this component was installed';
COMMENT ON COLUMN aircraft_components.component_hours_offset IS 'Component hours at installation (non-zero for used/overhauled components)';
COMMENT ON COLUMN aircraft_components.position IS 'Position identifier for multi-component setups (e.g., "left", "right", "1", "2")';

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_aircraft_components_plane_id ON aircraft_components(plane_id);
CREATE INDEX IF NOT EXISTS idx_aircraft_components_status ON aircraft_components(status);
CREATE INDEX IF NOT EXISTS idx_aircraft_components_plane_status ON aircraft_components(plane_id, status);
CREATE INDEX IF NOT EXISTS idx_aircraft_components_type ON aircraft_components(component_type);

-- 5. Create view for components with calculated hours and status
CREATE OR REPLACE VIEW aircraft_components_with_status AS
SELECT
  ac.*,
  p.tail_number,
  at.total_flight_hours as aircraft_current_hours,

  -- Calculate component's current hours
  -- Component hours = (aircraft current hours - hours at installation) + component offset
  CASE
    WHEN ac.status = 'active' THEN
      (at.total_flight_hours - ac.hours_at_installation) + ac.component_hours_offset
    ELSE
      -- For removed components, calculate hours at removal
      -- This would need the aircraft hours at removal time, stored separately
      ac.component_hours_offset
  END as component_current_hours,

  -- Calculate hours remaining until TBO
  CASE
    WHEN ac.status = 'active' THEN
      ac.tbo_hours - ((at.total_flight_hours - ac.hours_at_installation) + ac.component_hours_offset)
    ELSE
      NULL
  END as hours_remaining,

  -- Calculate percentage used
  CASE
    WHEN ac.status = 'active' THEN
      ROUND(
        (((at.total_flight_hours - ac.hours_at_installation) + ac.component_hours_offset) / ac.tbo_hours * 100)::numeric,
        1
      )
    ELSE
      NULL
  END as percentage_used,

  -- Determine status based on hours remaining
  CASE
    WHEN ac.status != 'active' THEN 'inactive'
    WHEN ac.tbo_hours - ((at.total_flight_hours - ac.hours_at_installation) + ac.component_hours_offset) < 0 THEN 'overdue'
    WHEN ac.tbo_hours - ((at.total_flight_hours - ac.hours_at_installation) + ac.component_hours_offset) <= (ac.tbo_hours * 0.05) THEN 'critical'  -- <= 5%
    WHEN ac.tbo_hours - ((at.total_flight_hours - ac.hours_at_installation) + ac.component_hours_offset) <= (ac.tbo_hours * 0.10) THEN 'warning'   -- <= 10%
    WHEN ac.tbo_hours - ((at.total_flight_hours - ac.hours_at_installation) + ac.component_hours_offset) <= (ac.tbo_hours * 0.20) THEN 'attention' -- <= 20%
    ELSE 'ok'
  END as tbo_status,

  -- User info
  creator.name as created_by_name,
  creator.surname as created_by_surname,
  installer.name as installed_by_name,
  installer.surname as installed_by_surname,
  remover.name as removed_by_name,
  remover.surname as removed_by_surname

FROM aircraft_components ac
JOIN planes p ON p.id = ac.plane_id
LEFT JOIN aircraft_totals at ON at.id = ac.plane_id
LEFT JOIN users creator ON creator.id = ac.created_by
LEFT JOIN users installer ON installer.id = ac.installed_by
LEFT JOIN users remover ON remover.id = ac.removed_by;

COMMENT ON VIEW aircraft_components_with_status IS 'Aircraft components with calculated hours, remaining hours, and TBO status';

-- 6. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_aircraft_components_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger for updated_at
CREATE TRIGGER aircraft_components_updated_at
  BEFORE UPDATE ON aircraft_components
  FOR EACH ROW
  EXECUTE FUNCTION update_aircraft_components_updated_at();

-- 8. Enable Row Level Security
ALTER TABLE aircraft_components ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies
-- All authenticated users can view components
CREATE POLICY "Anyone can view aircraft components"
  ON aircraft_components
  FOR SELECT
  TO authenticated
  USING (true);

-- Only board members can insert components
CREATE POLICY "Board members can insert aircraft components"
  ON aircraft_components
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'board' = ANY(users.role)
    )
  );

-- Only board members can update components
CREATE POLICY "Board members can update aircraft components"
  ON aircraft_components
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'board' = ANY(users.role)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'board' = ANY(users.role)
    )
  );

-- Only board members can delete components
CREATE POLICY "Board members can delete aircraft components"
  ON aircraft_components
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'board' = ANY(users.role)
    )
  );

-- Force schema reload
NOTIFY pgrst, 'reload schema';
