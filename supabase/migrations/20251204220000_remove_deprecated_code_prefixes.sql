-- Remove deprecated voucher_code_prefix and booking_code_prefix from store_settings
-- These prefixes are now managed per voucher type and ticket type

-- Drop the deprecated columns from store_settings
ALTER TABLE store_settings
DROP COLUMN IF EXISTS voucher_code_prefix,
DROP COLUMN IF EXISTS booking_code_prefix;

-- Add comment explaining the change
COMMENT ON TABLE store_settings IS 'Global store configuration. Code prefixes are now managed in voucher_types and ticket_types tables.';
