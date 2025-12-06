-- Add personalization fields to vouchers table
-- These fields allow buyers to personalize their voucher purchases

ALTER TABLE vouchers
  ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS personal_message TEXT;

-- Create index for recipient name searches
CREATE INDEX IF NOT EXISTS idx_vouchers_recipient_name ON vouchers(recipient_name);

COMMENT ON COLUMN vouchers.recipient_name IS 'Name of the person receiving the voucher (e.g., "John Smith")';
COMMENT ON COLUMN vouchers.personal_message IS 'Custom message from buyer to recipient (e.g., "Happy Birthday! Enjoy your adventure!")';
