-- Component TBO Presets
-- Provides default TBO values for common aircraft components

-- 1. Create component_tbo_presets table
CREATE TABLE IF NOT EXISTS component_tbo_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  component_type component_type NOT NULL,
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,

  -- TBO information
  tbo_hours NUMERIC(10, 2) NOT NULL,
  description TEXT,

  -- Is this a commonly used preset?
  is_common BOOLEAN NOT NULL DEFAULT false,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one preset per manufacturer/model combination
  UNIQUE(component_type, manufacturer, model)
);

COMMENT ON TABLE component_tbo_presets IS 'Default TBO values for common aircraft components';
COMMENT ON COLUMN component_tbo_presets.is_common IS 'Marks commonly used components for quick selection in UI';

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_component_tbo_presets_type ON component_tbo_presets(component_type);
CREATE INDEX IF NOT EXISTS idx_component_tbo_presets_common ON component_tbo_presets(is_common) WHERE is_common = true;

-- 3. Enable Row Level Security
ALTER TABLE component_tbo_presets ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies - Everyone can read, only board members can modify
CREATE POLICY "Anyone can view component TBO presets"
  ON component_tbo_presets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Board members can manage component TBO presets"
  ON component_tbo_presets
  FOR ALL
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

-- 5. Insert common presets for engines
INSERT INTO component_tbo_presets (component_type, manufacturer, model, tbo_hours, description, is_common) VALUES
  -- Lycoming Engines (very common in GA)
  ('engine', 'Lycoming', 'O-235', 2000, 'Lycoming O-235 series engine', true),
  ('engine', 'Lycoming', 'O-320', 2000, 'Lycoming O-320 series engine', true),
  ('engine', 'Lycoming', 'O-360', 2000, 'Lycoming O-360 series engine', true),
  ('engine', 'Lycoming', 'IO-360', 2000, 'Lycoming IO-360 series (fuel injected)', true),
  ('engine', 'Lycoming', 'O-540', 2000, 'Lycoming O-540 series engine', true),
  ('engine', 'Lycoming', 'IO-540', 2000, 'Lycoming IO-540 series (fuel injected)', true),

  -- Continental Engines
  ('engine', 'Continental', 'O-200', 1800, 'Continental O-200 series engine', true),
  ('engine', 'Continental', 'O-300', 1800, 'Continental O-300 series engine', true),
  ('engine', 'Continental', 'IO-360', 2000, 'Continental IO-360 series engine', true),
  ('engine', 'Continental', 'IO-520', 1700, 'Continental IO-520 series engine', true),
  ('engine', 'Continental', 'IO-550', 2000, 'Continental IO-550 series engine', true),

  -- Rotax Engines (common in LSA and ultralights)
  ('engine', 'Rotax', '912 ULS', 2000, 'Rotax 912 ULS 100hp', true),
  ('engine', 'Rotax', '912 iS', 2000, 'Rotax 912 iS (fuel injected)', true),
  ('engine', 'Rotax', '914', 2000, 'Rotax 914 turbocharged', true),
  ('engine', 'Rotax', '915 iS', 2000, 'Rotax 915 iS turbocharged', true);

-- 6. Insert common presets for propellers
INSERT INTO component_tbo_presets (component_type, manufacturer, model, tbo_hours, description, is_common) VALUES
  -- Fixed pitch propellers (typically unlimited life with inspections)
  ('propeller', 'Sensenich', 'Fixed Pitch', 5000, 'Sensenich fixed pitch metal propeller', true),
  ('propeller', 'McCauley', 'Fixed Pitch', 5000, 'McCauley fixed pitch metal propeller', true),

  -- Constant speed propellers
  ('propeller', 'Hartzell', 'Constant Speed', 2400, 'Hartzell constant speed propeller', true),
  ('propeller', 'McCauley', 'Constant Speed', 2400, 'McCauley constant speed propeller', true),
  ('propeller', 'MT Propeller', 'Composite', 6000, 'MT composite constant speed propeller', true),

  -- Wooden propellers
  ('propeller', 'Various', 'Wooden', 1000, 'Wooden propeller (varies by manufacturer)', false);

-- 7. Insert presets for other common components
INSERT INTO component_tbo_presets (component_type, manufacturer, model, tbo_hours, description, is_common) VALUES
  -- Magnetos
  ('magneto', 'Bendix', 'S-20/S-200', 500, 'Bendix S-series magneto (500h inspection)', true),
  ('magneto', 'Slick', '4370/4371', 500, 'Slick 4370/4371 series magneto', true),

  -- Vacuum pumps
  ('vacuum_pump', 'Rapco', 'RA215CC', 500, 'Rapco dry vacuum pump', true),
  ('vacuum_pump', 'Tempest', 'AA441CC', 500, 'Tempest dry vacuum pump', true),

  -- Constant speed units
  ('constant_speed_unit', 'Hartzell', 'Governor', 2400, 'Hartzell propeller governor', false),
  ('constant_speed_unit', 'McCauley', 'Governor', 2400, 'McCauley propeller governor', false),

  -- Alternators
  ('alternator', 'Plane Power', 'ALT-12-60', 2000, 'Plane Power 60A alternator', false),
  ('alternator', 'Hartzell', 'ALT-12-70', 2000, 'Hartzell 70A alternator', false),

  -- Starters
  ('starter', 'Sky-Tec', 'Various', 2000, 'Sky-Tec lightweight starter', false);

-- Force schema reload
NOTIFY pgrst, 'reload schema';
