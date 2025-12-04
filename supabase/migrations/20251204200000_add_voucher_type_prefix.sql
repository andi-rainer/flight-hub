-- ============================================================================
-- ADD VOUCHER TYPE SPECIFIC CODE PREFIX
-- ============================================================================
-- This migration adds code_prefix to voucher_types so each type can have
-- its own prefix (e.g., TV-, TS-, TDM-, etc.)
-- ============================================================================

-- Add code_prefix column to voucher_types
ALTER TABLE voucher_types
ADD COLUMN IF NOT EXISTS code_prefix VARCHAR(10) NOT NULL DEFAULT 'TDM';

-- Add constraint to ensure prefix is uppercase and valid format
ALTER TABLE voucher_types
ADD CONSTRAINT check_code_prefix_format
CHECK (code_prefix ~ '^[A-Z0-9]{2,10}$');

-- Update existing voucher types to have default prefixes
-- (Adjust these based on your needs)
UPDATE voucher_types
SET code_prefix = 'TDM'
WHERE code_prefix = 'TDM';

COMMENT ON COLUMN voucher_types.code_prefix IS 'Prefix for voucher codes of this type (e.g., TV, TS, TDM). Must be 2-10 uppercase letters/numbers.';
