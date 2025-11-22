-- Aircraft Weight and Balance System
-- Adds proper relational tables for CG limits and loading stations

-- ============================================================================
-- 1. Add empty_cg to planes table
-- ============================================================================

ALTER TABLE planes
ADD COLUMN IF NOT EXISTS empty_cg NUMERIC(10,2) NULL;

COMMENT ON COLUMN planes.empty_cg IS 'Empty aircraft CG position (arm) from datum point';

-- ============================================================================
-- 2. Create aircraft_cg_limits table
-- ============================================================================

CREATE TABLE IF NOT EXISTS aircraft_cg_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plane_id UUID NOT NULL REFERENCES planes(id) ON DELETE CASCADE,

  -- CG limit point data
  weight NUMERIC(10,2) NOT NULL CHECK (weight >= 0),
  arm NUMERIC(10,2) NOT NULL,

  -- Point type: 'forward' or 'aft' boundary
  limit_type TEXT NOT NULL CHECK (limit_type IN ('forward', 'aft')),

  -- Sort order for plotting the envelope (lower = plotted first)
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Notes for this limit point
  notes TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: prevent duplicate points at same weight for same plane
  UNIQUE(plane_id, limit_type, weight)
);

-- Create index for efficient queries
CREATE INDEX idx_aircraft_cg_limits_plane_id ON aircraft_cg_limits(plane_id);
CREATE INDEX idx_aircraft_cg_limits_sort_order ON aircraft_cg_limits(plane_id, sort_order);

-- Add comments
COMMENT ON TABLE aircraft_cg_limits IS 'CG envelope limit points for aircraft weight and balance calculations';
COMMENT ON COLUMN aircraft_cg_limits.weight IS 'Aircraft weight at this CG limit point (kg or lbs)';
COMMENT ON COLUMN aircraft_cg_limits.arm IS 'CG arm position from datum (inches or meters)';
COMMENT ON COLUMN aircraft_cg_limits.limit_type IS 'Forward or aft CG limit boundary';
COMMENT ON COLUMN aircraft_cg_limits.sort_order IS 'Order for plotting the CG envelope (0 = first point)';

-- ============================================================================
-- 3. Create aircraft_stations table
-- ============================================================================

CREATE TABLE IF NOT EXISTS aircraft_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plane_id UUID NOT NULL REFERENCES planes(id) ON DELETE CASCADE,

  -- Station identification
  name TEXT NOT NULL,
  station_type TEXT NOT NULL CHECK (station_type IN ('seat', 'cargo', 'fuel', 'aircraft_item')),

  -- Weight and balance data
  arm NUMERIC(10,2) NOT NULL,
  weight_limit NUMERIC(10,2) NOT NULL CHECK (weight_limit >= 0),
  basic_weight NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (basic_weight >= 0),

  -- Display order and status
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,

  -- Optional notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: station names must be unique per aircraft
  UNIQUE(plane_id, name)
);

-- Create indexes
CREATE INDEX idx_aircraft_stations_plane_id ON aircraft_stations(plane_id);
CREATE INDEX idx_aircraft_stations_active ON aircraft_stations(plane_id, active);
CREATE INDEX idx_aircraft_stations_type ON aircraft_stations(plane_id, station_type);
CREATE INDEX idx_aircraft_stations_sort_order ON aircraft_stations(plane_id, sort_order);

-- Add comments
COMMENT ON TABLE aircraft_stations IS 'Loading stations for aircraft weight and balance calculations';
COMMENT ON COLUMN aircraft_stations.name IS 'Station name (e.g., "Pilot Seat", "Front Baggage")';
COMMENT ON COLUMN aircraft_stations.station_type IS 'Type of station: seat, cargo, fuel, or aircraft_item';
COMMENT ON COLUMN aircraft_stations.arm IS 'Station arm position from datum (inches or meters)';
COMMENT ON COLUMN aircraft_stations.weight_limit IS 'Maximum weight allowed at this station';
COMMENT ON COLUMN aircraft_stations.basic_weight IS 'Basic Operating Weight (BOW) contribution - weight of the item itself';
COMMENT ON COLUMN aircraft_stations.sort_order IS 'Display order in UI (0 = first)';

-- ============================================================================
-- 4. Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE aircraft_cg_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE aircraft_stations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for aircraft_cg_limits
CREATE POLICY "Everyone can view CG limits"
  ON aircraft_cg_limits
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Board and Chief Pilot can manage CG limits"
  ON aircraft_cg_limits
  FOR ALL
  TO authenticated
  USING (
    is_board_member(auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_functions uf
      JOIN functions_master fm ON uf.function_id = fm.id
      WHERE uf.user_id = auth.uid()
        AND fm.code = 'chief_pilot'
        AND fm.active = true
        AND (uf.valid_until IS NULL OR uf.valid_until >= CURRENT_DATE)
    )
  );

-- RLS Policies for aircraft_stations
CREATE POLICY "Everyone can view stations"
  ON aircraft_stations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Board and Chief Pilot can manage stations"
  ON aircraft_stations
  FOR ALL
  TO authenticated
  USING (
    is_board_member(auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_functions uf
      JOIN functions_master fm ON uf.function_id = fm.id
      WHERE uf.user_id = auth.uid()
        AND fm.code = 'chief_pilot'
        AND fm.active = true
        AND (uf.valid_until IS NULL OR uf.valid_until >= CURRENT_DATE)
    )
  );

-- ============================================================================
-- 5. Create update trigger for updated_at
-- ============================================================================

CREATE TRIGGER update_aircraft_cg_limits_updated_at
  BEFORE UPDATE ON aircraft_cg_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_aircraft_stations_updated_at
  BEFORE UPDATE ON aircraft_stations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
