-- ============================================================================
-- VOUCHER & TICKETING SYSTEM
-- ============================================================================
-- This migration adds support for:
-- 1. Voucher sales and redemption
-- 2. Ticket booking for specific operation days
-- 3. Timeframe-based availability management
-- 4. Store integration settings

-- ============================================================================
-- VOUCHER TYPES (Product Catalog)
-- ============================================================================

CREATE TABLE voucher_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_de VARCHAR(255) NOT NULL,
  description TEXT,
  description_de TEXT,
  price_eur DECIMAL(10,2) NOT NULL,
  validity_days INTEGER, -- NULL = no expiry
  active BOOLEAN DEFAULT true,
  tandem_flight_type VARCHAR(50), -- 'standard', 'video', 'photo_video'
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  CONSTRAINT check_price_positive CHECK (price_eur > 0),
  CONSTRAINT check_validity_positive CHECK (validity_days IS NULL OR validity_days > 0)
);

CREATE INDEX idx_voucher_types_active ON voucher_types(active);
CREATE INDEX idx_voucher_types_code ON voucher_types(code);

-- ============================================================================
-- VOUCHERS (Purchased Vouchers)
-- ============================================================================

CREATE TABLE vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_code VARCHAR(20) UNIQUE NOT NULL, -- e.g., "TDM-2025-ABC123"
  voucher_type_id UUID REFERENCES voucher_types(id) ON DELETE RESTRICT,

  -- Purchase details
  purchase_date TIMESTAMPTZ DEFAULT NOW(),
  purchaser_name VARCHAR(255) NOT NULL,
  purchaser_email VARCHAR(255) NOT NULL,
  purchaser_phone VARCHAR(50),
  price_paid_eur DECIMAL(10,2) NOT NULL,
  payment_intent_id VARCHAR(255), -- Stripe payment intent

  -- Redemption details
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'redeemed', 'expired', 'cancelled'
  redeemed_at TIMESTAMPTZ,
  redeemed_by UUID REFERENCES users(id),
  redeemed_for_user_id UUID REFERENCES users(id), -- Linked tandem guest
  redeemed_for_flight_jumper_id UUID REFERENCES skydive_flight_jumpers(id),

  -- Validity
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,

  -- Metadata
  notes TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT check_status CHECK (status IN ('active', 'redeemed', 'expired', 'cancelled')),
  CONSTRAINT check_price_positive CHECK (price_paid_eur > 0),
  CONSTRAINT check_validity_dates CHECK (valid_until IS NULL OR valid_until > valid_from)
);

CREATE INDEX idx_vouchers_code ON vouchers(voucher_code);
CREATE INDEX idx_vouchers_status ON vouchers(status);
CREATE INDEX idx_vouchers_type ON vouchers(voucher_type_id);
CREATE INDEX idx_vouchers_email ON vouchers(purchaser_email);
CREATE INDEX idx_vouchers_purchase_date ON vouchers(purchase_date);
CREATE INDEX idx_vouchers_valid_until ON vouchers(valid_until);

-- ============================================================================
-- BOOKING TIMEFRAMES (Available time slots for booking)
-- ============================================================================

CREATE TABLE manifest_booking_timeframes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_day_id UUID REFERENCES skydive_operation_days(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_bookings INTEGER DEFAULT 4, -- Based on tandem slots available
  current_bookings INTEGER DEFAULT 0,
  overbooking_allowed INTEGER DEFAULT 0, -- Number of additional bookings allowed beyond max_bookings
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  CONSTRAINT check_time_range CHECK (end_time > start_time),
  CONSTRAINT check_max_bookings_positive CHECK (max_bookings > 0),
  CONSTRAINT check_current_bookings_non_negative CHECK (current_bookings >= 0),
  CONSTRAINT check_overbooking_non_negative CHECK (overbooking_allowed >= 0),
  UNIQUE(operation_day_id, start_time, end_time)
);

CREATE INDEX idx_timeframes_operation_day ON manifest_booking_timeframes(operation_day_id);
CREATE INDEX idx_timeframes_active ON manifest_booking_timeframes(active);

-- ============================================================================
-- TICKET BOOKINGS (Pre-paid bookings for specific days)
-- ============================================================================

CREATE TABLE ticket_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code VARCHAR(20) UNIQUE NOT NULL, -- e.g., "TKT-2025-XYZ789"

  -- Booking details
  operation_day_id UUID REFERENCES skydive_operation_days(id) ON DELETE RESTRICT,
  timeframe_id UUID REFERENCES manifest_booking_timeframes(id) ON DELETE RESTRICT,
  voucher_type_id UUID REFERENCES voucher_types(id) ON DELETE RESTRICT, -- What they bought

  -- Purchase details
  purchase_date TIMESTAMPTZ DEFAULT NOW(),
  purchaser_name VARCHAR(255) NOT NULL,
  purchaser_email VARCHAR(255) NOT NULL,
  purchaser_phone VARCHAR(50),
  price_paid_eur DECIMAL(10,2) NOT NULL,
  payment_intent_id VARCHAR(255),

  -- Assignment
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'assigned', 'completed', 'cancelled'
  assigned_to_flight_jumper_id UUID REFERENCES skydive_flight_jumpers(id),
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ,

  -- Metadata
  notes TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT check_status CHECK (status IN ('pending', 'confirmed', 'assigned', 'completed', 'cancelled')),
  CONSTRAINT check_price_positive CHECK (price_paid_eur > 0)
);

CREATE INDEX idx_bookings_code ON ticket_bookings(booking_code);
CREATE INDEX idx_bookings_status ON ticket_bookings(status);
CREATE INDEX idx_bookings_operation_day ON ticket_bookings(operation_day_id);
CREATE INDEX idx_bookings_timeframe ON ticket_bookings(timeframe_id);
CREATE INDEX idx_bookings_email ON ticket_bookings(purchaser_email);
CREATE INDEX idx_bookings_purchase_date ON ticket_bookings(purchase_date);

-- ============================================================================
-- STORE SETTINGS
-- ============================================================================

CREATE TABLE store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  redirect_url VARCHAR(500) NOT NULL DEFAULT 'https://skydive-salzburg.com',
  webhook_secret VARCHAR(255), -- Stripe webhook secret
  stripe_public_key VARCHAR(255),
  stripe_secret_key VARCHAR(255), -- Encrypted in application layer
  allow_voucher_sales BOOLEAN DEFAULT true,
  allow_ticket_sales BOOLEAN DEFAULT true,
  default_overbooking_allowed INTEGER DEFAULT 0, -- Default overbooking slots
  default_max_bookings_per_timeframe INTEGER DEFAULT 4,
  voucher_code_prefix VARCHAR(10) DEFAULT 'TDM',
  booking_code_prefix VARCHAR(10) DEFAULT 'TKT',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),

  CONSTRAINT check_overbooking_non_negative CHECK (default_overbooking_allowed >= 0),
  CONSTRAINT check_max_bookings_positive CHECK (default_max_bookings_per_timeframe > 0)
);

-- Insert default settings
INSERT INTO store_settings (redirect_url) VALUES ('https://skydive-salzburg.com');

-- ============================================================================
-- API KEYS (For Store to FlightHub communication)
-- ============================================================================

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) UNIQUE NOT NULL, -- SHA-256 hash of the API key
  permissions TEXT[] DEFAULT ARRAY['vouchers:create', 'bookings:create', 'vouchers:read', 'bookings:read'],
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  CONSTRAINT check_name_not_empty CHECK (length(trim(name)) > 0)
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(active);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_voucher_types_updated_at
  BEFORE UPDATE ON voucher_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vouchers_updated_at
  BEFORE UPDATE ON vouchers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timeframes_updated_at
  BEFORE UPDATE ON manifest_booking_timeframes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON ticket_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON store_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to check voucher validity
CREATE OR REPLACE FUNCTION is_voucher_valid(voucher_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_status VARCHAR(50);
  v_valid_until TIMESTAMPTZ;
BEGIN
  SELECT status, valid_until
  INTO v_status, v_valid_until
  FROM vouchers
  WHERE id = voucher_id;

  IF v_status != 'active' THEN
    RETURN FALSE;
  END IF;

  IF v_valid_until IS NOT NULL AND v_valid_until < NOW() THEN
    -- Auto-expire voucher
    UPDATE vouchers SET status = 'expired', updated_at = NOW() WHERE id = voucher_id;
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to check timeframe availability
CREATE OR REPLACE FUNCTION check_timeframe_availability(timeframe_id UUID)
RETURNS TABLE(
  available BOOLEAN,
  current_bookings INTEGER,
  max_bookings INTEGER,
  overbooking_allowed INTEGER,
  slots_remaining INTEGER
) AS $$
DECLARE
  v_current INTEGER;
  v_max INTEGER;
  v_overbooking INTEGER;
  v_total_allowed INTEGER;
  v_remaining INTEGER;
BEGIN
  SELECT
    t.current_bookings,
    t.max_bookings,
    t.overbooking_allowed
  INTO v_current, v_max, v_overbooking
  FROM manifest_booking_timeframes t
  WHERE t.id = timeframe_id AND t.active = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 0, 0, 0;
    RETURN;
  END IF;

  v_total_allowed := v_max + v_overbooking;
  v_remaining := v_total_allowed - v_current;

  RETURN QUERY SELECT
    v_current < v_total_allowed,
    v_current,
    v_max,
    v_overbooking,
    GREATEST(0, v_remaining);
END;
$$ LANGUAGE plpgsql;

-- Function to increment booking count
CREATE OR REPLACE FUNCTION increment_timeframe_bookings(timeframe_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_available BOOLEAN;
BEGIN
  -- Check availability
  SELECT available INTO v_available
  FROM check_timeframe_availability(timeframe_id);

  IF NOT v_available THEN
    RAISE EXCEPTION 'No slots available for this timeframe';
  END IF;

  -- Increment
  UPDATE manifest_booking_timeframes
  SET current_bookings = current_bookings + 1,
      updated_at = NOW()
  WHERE id = timeframe_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement booking count
CREATE OR REPLACE FUNCTION decrement_timeframe_bookings(timeframe_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE manifest_booking_timeframes
  SET current_bookings = GREATEST(0, current_bookings - 1),
      updated_at = NOW()
  WHERE id = timeframe_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE voucher_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE manifest_booking_timeframes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Voucher Types Policies
CREATE POLICY "Public can view active voucher types"
  ON voucher_types FOR SELECT
  USING (active = true);

CREATE POLICY "Board can manage voucher types"
  ON voucher_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND 'board' = ANY(role)
    )
  );

-- Vouchers Policies
CREATE POLICY "Board and manifest can view all vouchers"
  ON vouchers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND (
        'board' = ANY(role)
        OR id IN (
          SELECT user_id FROM user_functions
          WHERE function_id IN (
            SELECT id FROM functions_master WHERE code = 'manifest_coordinator'
          )
        )
      )
    )
  );

CREATE POLICY "Board and manifest can update vouchers"
  ON vouchers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND (
        'board' = ANY(role)
        OR id IN (
          SELECT user_id FROM user_functions
          WHERE function_id IN (
            SELECT id FROM functions_master WHERE code = 'manifest_coordinator'
          )
        )
      )
    )
  );

CREATE POLICY "Board can create vouchers manually"
  ON vouchers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND 'board' = ANY(role)
    )
  );

-- Timeframes Policies
CREATE POLICY "Public can view active timeframes"
  ON manifest_booking_timeframes FOR SELECT
  USING (active = true);

CREATE POLICY "Board and manifest can manage timeframes"
  ON manifest_booking_timeframes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND (
        'board' = ANY(role)
        OR id IN (
          SELECT user_id FROM user_functions
          WHERE function_id IN (
            SELECT id FROM functions_master WHERE code = 'manifest_coordinator'
          )
        )
      )
    )
  );

-- Ticket Bookings Policies
CREATE POLICY "Board and manifest can view all bookings"
  ON ticket_bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND (
        'board' = ANY(role)
        OR id IN (
          SELECT user_id FROM user_functions
          WHERE function_id IN (
            SELECT id FROM functions_master WHERE code = 'manifest_coordinator'
          )
        )
      )
    )
  );

CREATE POLICY "Board and manifest can update bookings"
  ON ticket_bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND (
        'board' = ANY(role)
        OR id IN (
          SELECT user_id FROM user_functions
          WHERE function_id IN (
            SELECT id FROM functions_master WHERE code = 'manifest_coordinator'
          )
        )
      )
    )
  );

-- Store Settings Policies
CREATE POLICY "Board can view store settings"
  ON store_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND 'board' = ANY(role)
    )
  );

CREATE POLICY "Board can update store settings"
  ON store_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND 'board' = ANY(role)
    )
  );

-- API Keys Policies
CREATE POLICY "Board can manage API keys"
  ON api_keys FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND 'board' = ANY(role)
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE voucher_types IS 'Product catalog for vouchers that can be sold in the store';
COMMENT ON TABLE vouchers IS 'Individual vouchers purchased by customers';
COMMENT ON TABLE manifest_booking_timeframes IS 'Available time windows for booking tickets on operation days';
COMMENT ON TABLE ticket_bookings IS 'Pre-paid ticket bookings for specific operation days and timeframes';
COMMENT ON TABLE store_settings IS 'Configuration for the external store integration';
COMMENT ON TABLE api_keys IS 'API keys for secure store-to-flighthub communication';

COMMENT ON COLUMN manifest_booking_timeframes.max_bookings IS 'Maximum number of bookings allowed (based on tandem slots)';
COMMENT ON COLUMN manifest_booking_timeframes.overbooking_allowed IS 'Number of additional bookings allowed beyond max_bookings';
COMMENT ON COLUMN store_settings.default_overbooking_allowed IS 'Default number of overbooking slots for new timeframes';
