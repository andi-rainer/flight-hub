-- ============================================================================
-- CHANGE VOUCHER VALIDITY FROM DAYS TO MONTHS
-- ============================================================================
-- This migration changes the voucher_types table to use validity_months
-- instead of validity_days. Vouchers will now expire on the last day of the
-- month, X months after purchase.
--
-- Example: Purchase on Jan 15, 2025 with 12 months validity -> Expires Jan 31, 2026

-- Add new validity_months column
ALTER TABLE voucher_types
  ADD COLUMN validity_months INTEGER;

-- Migrate existing data (approximate conversion: 30 days ≈ 1 month)
-- This converts existing validity_days to months (rounded up)
UPDATE voucher_types
SET validity_months = CASE
  WHEN validity_days IS NULL THEN NULL
  WHEN validity_days <= 30 THEN 1
  WHEN validity_days <= 60 THEN 2
  WHEN validity_days <= 90 THEN 3
  WHEN validity_days <= 120 THEN 4
  WHEN validity_days <= 150 THEN 5
  WHEN validity_days <= 180 THEN 6
  WHEN validity_days <= 210 THEN 7
  WHEN validity_days <= 240 THEN 8
  WHEN validity_days <= 270 THEN 9
  WHEN validity_days <= 300 THEN 10
  WHEN validity_days <= 330 THEN 11
  ELSE CEIL(validity_days / 30.0)
END;

-- Drop old constraint
ALTER TABLE voucher_types
  DROP CONSTRAINT IF EXISTS check_validity_positive;

-- Drop old column
ALTER TABLE voucher_types
  DROP COLUMN validity_days;

-- Add new constraint
ALTER TABLE voucher_types
  ADD CONSTRAINT check_validity_months_positive
  CHECK (validity_months IS NULL OR validity_months > 0);

-- Add comment
COMMENT ON COLUMN voucher_types.validity_months IS 'Number of months voucher is valid. Expiry is set to last day of the month, X months after purchase. NULL = no expiry.';
