-- Skydive Manifest System
-- This migration creates tables, views, and functions for managing skydive operations
-- including operation days, flight scheduling, jumper assignments, and configuration.

-- ============================================================================
-- SYSTEM FUNCTIONS
-- ============================================================================

-- Add manifest_coordinator system function
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM functions_master WHERE code = 'manifest_coordinator'
  ) THEN
    INSERT INTO functions_master (code, name, name_de, category_id, is_system, active, sort_order)
    VALUES (
      'manifest_coordinator',
      'Manifest Coordinator',
      'Manifest-Koordinator',
      (SELECT id FROM function_categories WHERE code = 'operations'),
      true,
      true,
      30
    );
  END IF;
END $$;

-- Add skydive_pilot system function
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM functions_master WHERE code = 'skydive_pilot'
  ) THEN
    INSERT INTO functions_master (code, name, name_de, category_id, is_system, active, sort_order)
    VALUES (
      'skydive_pilot',
      'Skydive Pilot',
      'Fallschirm-Pilot',
      (SELECT id FROM function_categories WHERE code = 'skydiving'),
      true,
      true,
      25
    );
  END IF;
END $$;

-- ============================================================================
-- CONFIGURATION TABLE
-- ============================================================================

-- Table: manifest_settings
-- Stores club-specific settings for manifest operations (single row table)
CREATE TABLE IF NOT EXISTS manifest_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Jump altitude settings
  default_jump_altitude_feet INTEGER NOT NULL DEFAULT 13000,
  min_jump_altitude_feet INTEGER NOT NULL DEFAULT 3000,
  max_jump_altitude_feet INTEGER NOT NULL DEFAULT 15000,

  -- Flight scheduling defaults
  default_flight_interval_minutes INTEGER NOT NULL DEFAULT 30,
  default_operation_start_time TIME NOT NULL DEFAULT '09:00:00',
  default_operation_end_time TIME NOT NULL DEFAULT '18:00:00',

  -- Payment settings (for future use)
  default_tandem_price_eur NUMERIC(10, 2),
  require_payment_before_boarding BOOLEAN DEFAULT false,

  -- Metadata
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES users(id)
);

-- Trigger for updated_at
CREATE TRIGGER update_manifest_settings_updated_at
  BEFORE UPDATE ON manifest_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO manifest_settings (
  default_jump_altitude_feet,
  min_jump_altitude_feet,
  max_jump_altitude_feet,
  default_flight_interval_minutes
) VALUES (
  13000,
  3000,
  15000,
  30
) ON CONFLICT DO NOTHING;

-- RLS for manifest_settings
ALTER TABLE manifest_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view manifest settings"
  ON manifest_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Board members can update manifest settings"
  ON manifest_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND 'board' = ANY(u.role)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND 'board' = ANY(u.role)
    )
  );

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Table: skydive_operation_days
-- Represents a planned skydive operation day with an aircraft
CREATE TABLE skydive_operation_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_date DATE NOT NULL,
  plane_id UUID NOT NULL REFERENCES planes(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_plane_operation_date UNIQUE(plane_id, operation_date)
);

-- Indexes for skydive_operation_days
CREATE INDEX idx_skydive_operation_days_date ON skydive_operation_days(operation_date DESC);
CREATE INDEX idx_skydive_operation_days_plane ON skydive_operation_days(plane_id);
CREATE INDEX idx_skydive_operation_days_status ON skydive_operation_days(status) WHERE status != 'cancelled';
CREATE INDEX idx_skydive_operation_days_created_by ON skydive_operation_days(created_by);

-- Trigger for updated_at on skydive_operation_days
CREATE TRIGGER update_skydive_operation_days_updated_at
  BEFORE UPDATE ON skydive_operation_days
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Table: skydive_flights
-- Individual flights (loads) within an operation day
CREATE TABLE skydive_flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_day_id UUID NOT NULL REFERENCES skydive_operation_days(id) ON DELETE CASCADE,
  flight_number INTEGER NOT NULL,
  scheduled_time TIME NOT NULL,
  pilot_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'ready', 'boarding', 'in_air', 'completed', 'cancelled')),
  actual_takeoff TIMESTAMPTZ,
  actual_landing TIMESTAMPTZ,
  altitude_feet INTEGER CHECK (altitude_feet > 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_operation_day_flight_number UNIQUE(operation_day_id, flight_number),
  CONSTRAINT unique_operation_day_scheduled_time UNIQUE(operation_day_id, scheduled_time),
  CONSTRAINT pilot_required_for_ready CHECK (
    status IN ('planned', 'cancelled') OR pilot_id IS NOT NULL
  ),
  CONSTRAINT times_logical CHECK (
    actual_landing IS NULL OR actual_takeoff IS NULL OR actual_landing > actual_takeoff
  )
);

-- Indexes for skydive_flights
CREATE INDEX idx_skydive_flights_operation_day ON skydive_flights(operation_day_id);
CREATE INDEX idx_skydive_flights_scheduled_time ON skydive_flights(operation_day_id, scheduled_time);
CREATE INDEX idx_skydive_flights_pilot ON skydive_flights(pilot_id);
CREATE INDEX idx_skydive_flights_status ON skydive_flights(status) WHERE status NOT IN ('completed', 'cancelled');

-- Trigger for updated_at on skydive_flights
CREATE TRIGGER update_skydive_flights_updated_at
  BEFORE UPDATE ON skydive_flights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Table: skydive_flight_jumpers
-- Jumpers assigned to flights (sport jumpers and tandem pairs)
CREATE TABLE skydive_flight_jumpers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id UUID NOT NULL REFERENCES skydive_flights(id) ON DELETE CASCADE,
  jumper_type TEXT NOT NULL CHECK (jumper_type IN ('sport', 'tandem')),
  slot_number INTEGER NOT NULL,
  slots_occupied INTEGER NOT NULL DEFAULT 1 CHECK (slots_occupied IN (1, 2)),

  -- For sport jumpers
  sport_jumper_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- For tandem jumps
  tandem_master_id UUID REFERENCES users(id) ON DELETE CASCADE,
  passenger_id UUID REFERENCES users(id) ON DELETE CASCADE,
  payment_type TEXT CHECK (payment_type IN ('cash', 'voucher', 'pending')),
  voucher_number TEXT,
  payment_received BOOLEAN DEFAULT false,
  payment_amount NUMERIC(10, 2) CHECK (payment_amount >= 0),

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT sport_jumper_check CHECK (
    jumper_type != 'sport' OR (
      sport_jumper_id IS NOT NULL
      AND tandem_master_id IS NULL
      AND passenger_id IS NULL
      AND payment_type IS NULL
      AND slots_occupied = 1
    )
  ),
  CONSTRAINT tandem_jumper_check CHECK (
    jumper_type != 'tandem' OR (
      tandem_master_id IS NOT NULL
      AND passenger_id IS NOT NULL
      AND payment_type IS NOT NULL
      AND sport_jumper_id IS NULL
      AND slots_occupied = 2
    )
  ),
  CONSTRAINT voucher_number_required CHECK (
    payment_type != 'voucher' OR voucher_number IS NOT NULL
  )
);

-- Indexes for skydive_flight_jumpers
CREATE INDEX idx_skydive_flight_jumpers_flight ON skydive_flight_jumpers(flight_id);
CREATE INDEX idx_skydive_flight_jumpers_sport ON skydive_flight_jumpers(sport_jumper_id) WHERE sport_jumper_id IS NOT NULL;
CREATE INDEX idx_skydive_flight_jumpers_tandem_master ON skydive_flight_jumpers(tandem_master_id) WHERE tandem_master_id IS NOT NULL;
CREATE INDEX idx_skydive_flight_jumpers_passenger ON skydive_flight_jumpers(passenger_id) WHERE passenger_id IS NOT NULL;
CREATE INDEX idx_skydive_flight_jumpers_payment ON skydive_flight_jumpers(payment_type, payment_received) WHERE payment_type IS NOT NULL;
CREATE INDEX idx_flight_jumpers_slots ON skydive_flight_jumpers(flight_id, slot_number, slots_occupied);

-- Trigger for updated_at on skydive_flight_jumpers
CREATE TRIGGER update_skydive_flight_jumpers_updated_at
  BEFORE UPDATE ON skydive_flight_jumpers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: check_slot_conflict
-- Ensures tandem pairs (2 slots) and sport jumpers (1 slot) don't overlap
CREATE OR REPLACE FUNCTION check_slot_conflict()
RETURNS TRIGGER AS $$
DECLARE
  conflicting_count INTEGER;
BEGIN
  -- Check if any existing jumpers conflict with the new/updated slots
  -- A jumper occupies slots from slot_number to (slot_number + slots_occupied - 1)
  SELECT COUNT(*)
  INTO conflicting_count
  FROM skydive_flight_jumpers
  WHERE flight_id = NEW.flight_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      -- New jumper's range overlaps with existing jumper's range
      (NEW.slot_number <= slot_number + slots_occupied - 1
       AND NEW.slot_number + NEW.slots_occupied - 1 >= slot_number)
    );

  IF conflicting_count > 0 THEN
    RAISE EXCEPTION 'Slot conflict: slots % to % are already occupied',
      NEW.slot_number, NEW.slot_number + NEW.slots_occupied - 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: enforce slot conflict checking
CREATE TRIGGER check_slot_conflict_trigger
  BEFORE INSERT OR UPDATE ON skydive_flight_jumpers
  FOR EACH ROW
  EXECUTE FUNCTION check_slot_conflict();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all manifest tables
ALTER TABLE skydive_operation_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE skydive_flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE skydive_flight_jumpers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for skydive_operation_days
CREATE POLICY "Anyone can view operation days"
  ON skydive_operation_days FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Board and manifest coordinators can insert operation days"
  ON skydive_operation_days FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        'board' = ANY(u.role)
        OR EXISTS (
          SELECT 1 FROM user_functions uf
          JOIN functions_master fm ON uf.function_id = fm.id
          WHERE uf.user_id = u.id
          AND fm.code = 'manifest_coordinator'
          AND fm.active = true
          AND (uf.valid_until IS NULL OR uf.valid_until >= CURRENT_DATE)
        )
      )
    )
  );

CREATE POLICY "Board and manifest coordinators can update operation days"
  ON skydive_operation_days FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        'board' = ANY(u.role)
        OR EXISTS (
          SELECT 1 FROM user_functions uf
          JOIN functions_master fm ON uf.function_id = fm.id
          WHERE uf.user_id = u.id
          AND fm.code = 'manifest_coordinator'
          AND fm.active = true
          AND (uf.valid_until IS NULL OR uf.valid_until >= CURRENT_DATE)
        )
      )
    )
  );

CREATE POLICY "Board can delete operation days"
  ON skydive_operation_days FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND 'board' = ANY(u.role)
    )
  );

-- RLS Policies for skydive_flights
CREATE POLICY "Anyone can view flights"
  ON skydive_flights FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Board and manifest coordinators can insert flights"
  ON skydive_flights FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        'board' = ANY(u.role)
        OR EXISTS (
          SELECT 1 FROM user_functions uf
          JOIN functions_master fm ON uf.function_id = fm.id
          WHERE uf.user_id = u.id
          AND fm.code = 'manifest_coordinator'
          AND fm.active = true
          AND (uf.valid_until IS NULL OR uf.valid_until >= CURRENT_DATE)
        )
      )
    )
  );

CREATE POLICY "Board and manifest coordinators can update flights"
  ON skydive_flights FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        'board' = ANY(u.role)
        OR EXISTS (
          SELECT 1 FROM user_functions uf
          JOIN functions_master fm ON uf.function_id = fm.id
          WHERE uf.user_id = u.id
          AND fm.code = 'manifest_coordinator'
          AND fm.active = true
          AND (uf.valid_until IS NULL OR uf.valid_until >= CURRENT_DATE)
        )
      )
    )
  );

CREATE POLICY "Board and manifest coordinators can delete flights"
  ON skydive_flights FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        'board' = ANY(u.role)
        OR EXISTS (
          SELECT 1 FROM user_functions uf
          JOIN functions_master fm ON uf.function_id = fm.id
          WHERE uf.user_id = u.id
          AND fm.code = 'manifest_coordinator'
          AND fm.active = true
          AND (uf.valid_until IS NULL OR uf.valid_until >= CURRENT_DATE)
        )
      )
    )
  );

-- RLS Policies for skydive_flight_jumpers
CREATE POLICY "Anyone can view flight jumpers"
  ON skydive_flight_jumpers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Board and manifest coordinators can insert jumpers"
  ON skydive_flight_jumpers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        'board' = ANY(u.role)
        OR EXISTS (
          SELECT 1 FROM user_functions uf
          JOIN functions_master fm ON uf.function_id = fm.id
          WHERE uf.user_id = u.id
          AND fm.code = 'manifest_coordinator'
          AND fm.active = true
          AND (uf.valid_until IS NULL OR uf.valid_until >= CURRENT_DATE)
        )
      )
    )
  );

CREATE POLICY "Board and manifest coordinators can update jumpers"
  ON skydive_flight_jumpers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        'board' = ANY(u.role)
        OR EXISTS (
          SELECT 1 FROM user_functions uf
          JOIN functions_master fm ON uf.function_id = fm.id
          WHERE uf.user_id = u.id
          AND fm.code = 'manifest_coordinator'
          AND fm.active = true
          AND (uf.valid_until IS NULL OR uf.valid_until >= CURRENT_DATE)
        )
      )
    )
  );

CREATE POLICY "Board and manifest coordinators can delete jumpers"
  ON skydive_flight_jumpers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        'board' = ANY(u.role)
        OR EXISTS (
          SELECT 1 FROM user_functions uf
          JOIN functions_master fm ON uf.function_id = fm.id
          WHERE uf.user_id = u.id
          AND fm.code = 'manifest_coordinator'
          AND fm.active = true
          AND (uf.valid_until IS NULL OR uf.valid_until >= CURRENT_DATE)
        )
      )
    )
  );

-- ============================================================================
-- DATABASE VIEWS
-- ============================================================================

-- View: manifest_flights_with_details
-- Denormalized view for efficient manifest display
CREATE VIEW manifest_flights_with_details AS
SELECT
  sf.id,
  sf.operation_day_id,
  sf.flight_number,
  sf.scheduled_time,
  sf.status,
  sf.actual_takeoff,
  sf.actual_landing,
  sf.altitude_feet,
  sf.notes,

  -- Pilot details
  sf.pilot_id,
  pilot.name AS pilot_name,
  pilot.surname AS pilot_surname,

  -- Operation day details
  sod.operation_date,
  sod.plane_id,
  p.tail_number,
  p.type AS plane_type,

  -- Jumper counts
  (SELECT COUNT(*) FROM skydive_flight_jumpers WHERE flight_id = sf.id) AS total_jumpers,
  (SELECT COUNT(*) FROM skydive_flight_jumpers WHERE flight_id = sf.id AND jumper_type = 'sport') AS sport_jumpers_count,
  (SELECT COUNT(*) FROM skydive_flight_jumpers WHERE flight_id = sf.id AND jumper_type = 'tandem') AS tandem_pairs_count,

  -- Payment tracking
  (SELECT COUNT(*) FROM skydive_flight_jumpers
   WHERE flight_id = sf.id AND jumper_type = 'tandem' AND payment_received = false) AS unpaid_tandems_count

FROM skydive_flights sf
JOIN skydive_operation_days sod ON sf.operation_day_id = sod.id
JOIN planes p ON sod.plane_id = p.id
LEFT JOIN users pilot ON sf.pilot_id = pilot.id
ORDER BY sod.operation_date DESC, sf.scheduled_time ASC;

-- ============================================================================
-- DATABASE FUNCTIONS
-- ============================================================================

-- Function: create_operation_day_reservation
-- Auto-creates priority reservation when operation day is planned
CREATE OR REPLACE FUNCTION create_operation_day_reservation()
RETURNS TRIGGER AS $$
DECLARE
  reservation_start TIMESTAMPTZ;
  reservation_end TIMESTAMPTZ;
  new_reservation_id UUID;
BEGIN
  -- Create all-day reservation (6am to 9pm)
  reservation_start := (NEW.operation_date::DATE + INTERVAL '6 hours')::TIMESTAMPTZ;
  reservation_end := (NEW.operation_date::DATE + INTERVAL '21 hours')::TIMESTAMPTZ;

  INSERT INTO reservations (
    plane_id,
    user_id,
    start_time,
    end_time,
    status,
    priority,
    remarks
  ) VALUES (
    NEW.plane_id,
    NEW.created_by,
    reservation_start,
    reservation_end,
    'active',
    true,
    'Auto-created for skydive operation day on ' || NEW.operation_date
  )
  RETURNING id INTO new_reservation_id;

  -- Update operation day with reservation reference
  NEW.reservation_id := new_reservation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: auto_create_reservation_on_operation_day
CREATE TRIGGER auto_create_reservation_on_operation_day
  BEFORE INSERT ON skydive_operation_days
  FOR EACH ROW
  EXECUTE FUNCTION create_operation_day_reservation();

-- Function: get_available_tandem_masters
-- Returns users with tandem_master function valid on given date
CREATE OR REPLACE FUNCTION get_available_tandem_masters(operation_date DATE)
RETURNS TABLE(
  user_id UUID,
  name TEXT,
  surname TEXT,
  email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    u.id,
    u.name,
    u.surname,
    u.email
  FROM users u
  JOIN user_functions uf ON u.id = uf.user_id
  JOIN functions_master fm ON uf.function_id = fm.id
  WHERE fm.code = 'tandem_master'
    AND fm.active = true
    AND (uf.valid_until IS NULL OR uf.valid_until >= operation_date)
    AND u.left_at IS NULL
  ORDER BY u.surname, u.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: get_available_sport_jumpers
-- Returns users with skydiving functions valid on given date
CREATE OR REPLACE FUNCTION get_available_sport_jumpers(operation_date DATE)
RETURNS TABLE(
  user_id UUID,
  name TEXT,
  surname TEXT,
  email TEXT,
  function_codes TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    u.id,
    u.name,
    u.surname,
    u.email,
    ARRAY_AGG(DISTINCT fm.code) AS function_codes
  FROM users u
  JOIN user_functions uf ON u.id = uf.user_id
  JOIN functions_master fm ON uf.function_id = fm.id
  WHERE fm.category_id = (SELECT id FROM function_categories WHERE code = 'skydiving')
    AND fm.code IN ('sport_jumper', 'skydive_instructor', 'tandem_master')
    AND fm.active = true
    AND (uf.valid_until IS NULL OR uf.valid_until >= operation_date)
    AND u.left_at IS NULL
  GROUP BY u.id, u.name, u.surname, u.email
  ORDER BY u.surname, u.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: get_available_pilots
-- Returns users with pilot or skydive_pilot function valid on given date
CREATE OR REPLACE FUNCTION get_available_pilots(operation_date DATE)
RETURNS TABLE(
  user_id UUID,
  name TEXT,
  surname TEXT,
  email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    u.id,
    u.name,
    u.surname,
    u.email
  FROM users u
  JOIN user_functions uf ON u.id = uf.user_id
  JOIN functions_master fm ON uf.function_id = fm.id
  WHERE fm.code IN ('pilot', 'skydive_pilot')
    AND fm.active = true
    AND (uf.valid_until IS NULL OR uf.valid_until >= operation_date)
    AND u.left_at IS NULL
  ORDER BY u.surname, u.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: get_available_tandem_passengers
-- Returns users with active short-term membership for tandem jump selection
CREATE OR REPLACE FUNCTION get_available_tandem_passengers(
  show_all BOOLEAN DEFAULT false
)
RETURNS TABLE(
  user_id UUID,
  name TEXT,
  surname TEXT,
  email TEXT,
  member_number TEXT,
  jump_completed BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    u.id,
    u.name,
    u.surname,
    u.email,
    um.member_number,
    u.tandem_jump_completed
  FROM users u
  JOIN user_memberships um ON u.id = um.user_id
  JOIN membership_types mt ON um.membership_type_id = mt.id
  WHERE mt.member_category = 'short-term'
    AND um.status = 'active'
    AND u.left_at IS NULL
    AND (show_all = true OR u.tandem_jump_completed = false)
  ORDER BY u.surname, u.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: mark_flight_completed
-- Marks a flight as completed and updates tandem passengers' jump completion status
CREATE OR REPLACE FUNCTION mark_flight_completed(flight_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  flight_record RECORD;
  jumper_record RECORD;
BEGIN
  -- Get flight details
  SELECT sf.id, sf.operation_day_id, sod.operation_date
  INTO flight_record
  FROM skydive_flights sf
  JOIN skydive_operation_days sod ON sf.operation_day_id = sod.id
  WHERE sf.id = flight_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Flight not found';
  END IF;

  -- Update flight status to completed
  UPDATE skydive_flights
  SET status = 'completed'
  WHERE id = flight_id_param;

  -- Update tandem passengers to mark their jump as completed
  FOR jumper_record IN
    SELECT passenger_id
    FROM skydive_flight_jumpers
    WHERE flight_id = flight_id_param
      AND jumper_type = 'tandem'
      AND passenger_id IS NOT NULL
  LOOP
    UPDATE users
    SET tandem_jump_completed = true,
        tandem_jump_date = flight_record.operation_date
    WHERE id = jumper_record.passenger_id;
  END LOOP;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE manifest_settings IS 'Club-specific configuration for skydive manifest operations (single row table)';
COMMENT ON TABLE skydive_operation_days IS 'Planned skydive operation days with aircraft assignment and auto-created reservations';
COMMENT ON TABLE skydive_flights IS 'Individual flights (loads) within an operation day with pilot assignment and status tracking';
COMMENT ON TABLE skydive_flight_jumpers IS 'Jumpers assigned to flights - supports both sport jumpers and tandem pairs with payment tracking';

COMMENT ON COLUMN manifest_settings.default_jump_altitude_feet IS 'Default altitude in feet for new flights';
COMMENT ON COLUMN manifest_settings.default_flight_interval_minutes IS 'Suggested time interval between flights in minutes';
COMMENT ON COLUMN manifest_settings.default_tandem_price_eur IS 'Default price for tandem jumps in EUR (optional)';

COMMENT ON COLUMN skydive_operation_days.reservation_id IS 'Auto-created priority reservation for the aircraft on this date';

COMMENT ON COLUMN skydive_flights.status IS 'Flight status: planned, ready, boarding, in_air, completed, cancelled';
COMMENT ON COLUMN skydive_flights.pilot_id IS 'Pilot assigned to this flight - required before flight can be marked ready';

COMMENT ON COLUMN skydive_flight_jumpers.jumper_type IS 'Type: sport (solo jumper) or tandem (tandem pair)';
COMMENT ON COLUMN skydive_flight_jumpers.slots_occupied IS 'Number of slots this jumper occupies on the aircraft. Sport jumpers: 1, Tandem pairs: 2 (master + passenger)';
COMMENT ON COLUMN skydive_flight_jumpers.payment_type IS 'For tandem jumps: cash, voucher, or pending';
COMMENT ON COLUMN skydive_flight_jumpers.voucher_number IS 'Voucher code if payment_type is voucher';

COMMENT ON VIEW manifest_flights_with_details IS 'Denormalized view of flights with operation day, plane, pilot, and jumper counts for efficient manifest display';

COMMENT ON FUNCTION create_operation_day_reservation() IS 'Trigger function that auto-creates a priority aircraft reservation when operation day is planned';
COMMENT ON FUNCTION check_slot_conflict() IS 'Trigger function that ensures no slot conflicts between sport jumpers (1 slot) and tandem pairs (2 consecutive slots)';
COMMENT ON FUNCTION get_available_tandem_masters(DATE) IS 'Returns users with active tandem_master function valid on the given date';
COMMENT ON FUNCTION get_available_sport_jumpers(DATE) IS 'Returns users with skydiving functions valid on the given date';
COMMENT ON FUNCTION get_available_pilots(DATE) IS 'Returns users with active pilot or skydive_pilot function valid on the given date';
COMMENT ON FUNCTION get_available_tandem_passengers(BOOLEAN) IS 'Returns users with active short-term membership. If show_all=false, only returns users who have not completed their tandem jump.';
COMMENT ON FUNCTION mark_flight_completed(UUID) IS 'Marks a flight as completed and updates tandem passengers jump completion status and date';
