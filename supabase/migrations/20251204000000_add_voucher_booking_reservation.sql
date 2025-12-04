-- ============================================================================
-- VOUCHER BOOKING RESERVATION SYSTEM
-- ============================================================================
-- This migration adds support for customers to reserve booking slots using
-- existing vouchers instead of direct payment.
--
-- Changes:
-- 1. Add 'reserved' status to vouchers (when date is booked but not redeemed)
-- 2. Link vouchers to bookings via voucher_id
-- 3. Make payment fields optional in ticket_bookings
-- 4. Add reserved_booking_id to vouchers for bidirectional link
--
-- ============================================================================

-- ============================================================================
-- 1. UPDATE VOUCHERS TABLE
-- ============================================================================

-- Add new status 'reserved' for vouchers that have a date booked
ALTER TABLE vouchers DROP CONSTRAINT IF EXISTS check_status;
ALTER TABLE vouchers ADD CONSTRAINT check_status
  CHECK (status IN ('active', 'reserved', 'redeemed', 'expired', 'cancelled'));

-- Add link to the booking reservation
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS reserved_booking_id UUID REFERENCES ticket_bookings(id) ON DELETE SET NULL;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_vouchers_reserved_booking ON vouchers(reserved_booking_id);

-- ============================================================================
-- 2. UPDATE TICKET_BOOKINGS TABLE
-- ============================================================================

-- Add voucher_id to link bookings made with vouchers
ALTER TABLE ticket_bookings ADD COLUMN IF NOT EXISTS voucher_id UUID REFERENCES vouchers(id) ON DELETE SET NULL;

-- Make payment fields optional (NULL when using voucher)
ALTER TABLE ticket_bookings ALTER COLUMN price_paid_eur DROP NOT NULL;
ALTER TABLE ticket_bookings ALTER COLUMN payment_intent_id DROP NOT NULL;

-- Update check constraint to allow zero price for voucher bookings
ALTER TABLE ticket_bookings DROP CONSTRAINT IF EXISTS check_price_positive;
ALTER TABLE ticket_bookings ADD CONSTRAINT check_price_positive
  CHECK (price_paid_eur IS NULL OR price_paid_eur >= 0);

-- Create index for efficient voucher lookups
CREATE INDEX IF NOT EXISTS idx_bookings_voucher ON ticket_bookings(voucher_id);

-- ============================================================================
-- 3. UPDATE FUNCTIONS
-- ============================================================================

-- Updated function to check voucher validity including reservation status
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

  -- Voucher must be 'active' (not reserved, redeemed, expired, or cancelled)
  IF v_status != 'active' THEN
    RETURN FALSE;
  END IF;

  -- Check expiry
  IF v_valid_until IS NOT NULL AND v_valid_until < NOW() THEN
    -- Auto-expire voucher
    UPDATE vouchers SET status = 'expired', updated_at = NOW() WHERE id = voucher_id;
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to check if voucher can be used for booking
CREATE OR REPLACE FUNCTION is_voucher_available_for_booking(voucher_code_param VARCHAR(20))
RETURNS TABLE(
  available BOOLEAN,
  voucher_id UUID,
  status VARCHAR(50),
  valid_until TIMESTAMPTZ,
  voucher_type_name VARCHAR(255),
  error_message TEXT
) AS $$
DECLARE
  v_record RECORD;
BEGIN
  -- Look up voucher
  SELECT
    v.id,
    v.status,
    v.valid_until,
    vt.name
  INTO v_record
  FROM vouchers v
  JOIN voucher_types vt ON v.voucher_type_id = vt.id
  WHERE v.voucher_code = voucher_code_param;

  -- Voucher not found
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false,
      NULL::UUID,
      NULL::VARCHAR(50),
      NULL::TIMESTAMPTZ,
      NULL::VARCHAR(255),
      'Voucher code not found'::TEXT;
    RETURN;
  END IF;

  -- Check if already used or reserved
  IF v_record.status != 'active' THEN
    RETURN QUERY SELECT
      false,
      v_record.id,
      v_record.status,
      v_record.valid_until,
      v_record.name,
      CASE v_record.status
        WHEN 'reserved' THEN 'Voucher already has a booking reserved'
        WHEN 'redeemed' THEN 'Voucher has already been used'
        WHEN 'expired' THEN 'Voucher has expired'
        WHEN 'cancelled' THEN 'Voucher has been cancelled'
        ELSE 'Voucher is not available'
      END::TEXT;
    RETURN;
  END IF;

  -- Check expiry
  IF v_record.valid_until IS NOT NULL AND v_record.valid_until < NOW() THEN
    -- Auto-expire
    UPDATE vouchers SET status = 'expired', updated_at = NOW() WHERE id = v_record.id;
    RETURN QUERY SELECT
      false,
      v_record.id,
      'expired'::VARCHAR(50),
      v_record.valid_until,
      v_record.name,
      'Voucher has expired'::TEXT;
    RETURN;
  END IF;

  -- Voucher is available
  RETURN QUERY SELECT
    true,
    v_record.id,
    v_record.status,
    v_record.valid_until,
    v_record.name,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to reserve a voucher for a booking
CREATE OR REPLACE FUNCTION reserve_voucher_for_booking(
  voucher_id_param UUID,
  booking_id_param UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update voucher status to reserved and link to booking
  UPDATE vouchers
  SET
    status = 'reserved',
    reserved_booking_id = booking_id_param,
    reserved_at = NOW(),
    updated_at = NOW()
  WHERE id = voucher_id_param
    AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Voucher not found or not available for reservation';
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to unreserve a voucher (e.g., when booking is cancelled)
CREATE OR REPLACE FUNCTION unreserve_voucher(voucher_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE vouchers
  SET
    status = 'active',
    reserved_booking_id = NULL,
    reserved_at = NULL,
    updated_at = NOW()
  WHERE id = voucher_id_param
    AND status = 'reserved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Voucher not found or not reserved';
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. UPDATE TRIGGER FOR BOOKING CANCELLATION
-- ============================================================================

-- Function to handle voucher unreservation when booking is cancelled
CREATE OR REPLACE FUNCTION handle_booking_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  -- If booking is being cancelled and it has a voucher, unreserve it
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' AND NEW.voucher_id IS NOT NULL THEN
    PERFORM unreserve_voucher(NEW.voucher_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_booking_cancellation
  AFTER UPDATE ON ticket_bookings
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status != 'cancelled')
  EXECUTE FUNCTION handle_booking_cancellation();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN vouchers.reserved_booking_id IS 'Link to booking when voucher is reserved for a specific date (status=reserved)';
COMMENT ON COLUMN vouchers.reserved_at IS 'Timestamp when voucher was reserved for a booking';
COMMENT ON COLUMN ticket_bookings.voucher_id IS 'Link to voucher if booking was made using an existing voucher instead of payment';
