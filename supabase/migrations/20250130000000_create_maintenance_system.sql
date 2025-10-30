-- Aircraft Maintenance Tracking System
-- This migration adds comprehensive maintenance tracking for aircraft

-- 1. Add maintenance tracking columns to planes table
ALTER TABLE planes
ADD COLUMN IF NOT EXISTS next_maintenance_hours NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS maintenance_interval_hours NUMERIC(10, 2) DEFAULT 50.0;

COMMENT ON COLUMN planes.next_maintenance_hours IS 'Aircraft hours when next maintenance is due';
COMMENT ON COLUMN planes.maintenance_interval_hours IS 'Standard interval between maintenance in hours';

-- 2. Create maintenance_records table to track all maintenance history
CREATE TABLE IF NOT EXISTS maintenance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plane_id UUID NOT NULL REFERENCES planes(id) ON DELETE CASCADE,
  performed_at TIMESTAMPTZ NOT NULL,
  performed_at_hours NUMERIC(10, 2) NOT NULL,
  performed_by UUID NOT NULL REFERENCES users(id),
  maintenance_type TEXT NOT NULL,
  description TEXT,
  next_due_hours NUMERIC(10, 2),
  cost NUMERIC(10, 2),
  vendor TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE maintenance_records IS 'Historical record of all maintenance performed on aircraft';
COMMENT ON COLUMN maintenance_records.performed_at_hours IS 'Aircraft total hours when maintenance was performed';
COMMENT ON COLUMN maintenance_records.next_due_hours IS 'Aircraft hours when next maintenance is due (snapshot at time of record)';
COMMENT ON COLUMN maintenance_records.maintenance_type IS 'Type of maintenance: 50h, 100h, Annual, AD Compliance, etc.';

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_records_plane_id ON maintenance_records(plane_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_performed_at ON maintenance_records(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_plane_performed ON maintenance_records(plane_id, performed_at DESC);

-- 4. Create view for aircraft with maintenance status
CREATE OR REPLACE VIEW aircraft_with_maintenance AS
SELECT
  at.*,
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

COMMENT ON VIEW aircraft_with_maintenance IS 'Aircraft with real-time maintenance status calculated from total flight hours';

-- 5. Enable Row Level Security on maintenance_records
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for maintenance_records
-- Allow all authenticated users to read maintenance records
CREATE POLICY "Anyone can view maintenance records"
  ON maintenance_records
  FOR SELECT
  TO authenticated
  USING (true);

-- Only board members can insert maintenance records
CREATE POLICY "Board members can insert maintenance records"
  ON maintenance_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'board' = ANY(users.role)
    )
  );

-- Only board members can update maintenance records
CREATE POLICY "Board members can update maintenance records"
  ON maintenance_records
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

-- Only board members can delete maintenance records
CREATE POLICY "Board members can delete maintenance records"
  ON maintenance_records
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'board' = ANY(users.role)
    )
  );

-- 7. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_maintenance_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to automatically update updated_at
CREATE TRIGGER maintenance_records_updated_at
  BEFORE UPDATE ON maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION update_maintenance_records_updated_at();

-- Force schema reload
NOTIFY pgrst, 'reload schema';
