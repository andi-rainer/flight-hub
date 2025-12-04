-- ============================================================================
-- ADD REDEEM VOUCHER CARD TO STORE
-- ============================================================================
-- This migration adds a third card to the store homepage: "Redeem Voucher"
-- This card allows voucher recipients to book dates without seeing prices.
--
-- Changes:
-- 1. Add redeem card content fields to store_content
-- 2. Add allow_redeem_bookings toggle to store_settings
-- ============================================================================

-- ============================================================================
-- 1. UPDATE STORE_CONTENT TABLE
-- ============================================================================

ALTER TABLE store_content ADD COLUMN IF NOT EXISTS redeem_card_title VARCHAR(255) NOT NULL DEFAULT 'Redeem Voucher';
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS redeem_card_title_de VARCHAR(255) NOT NULL DEFAULT 'Gutschein einlösen';
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS redeem_card_subtitle VARCHAR(255);
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS redeem_card_subtitle_de VARCHAR(255);
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS redeem_card_description TEXT NOT NULL DEFAULT 'Already have a voucher? Book your jump date here.';
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS redeem_card_description_de TEXT NOT NULL DEFAULT 'Haben Sie bereits einen Gutschein? Buchen Sie hier Ihr Sprungdatum.';
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS redeem_card_features JSONB NOT NULL DEFAULT '[
  {"text": "Enter your voucher code", "text_de": "Geben Sie Ihren Gutscheincode ein"},
  {"text": "Choose your preferred date", "text_de": "Wählen Sie Ihr Wunschdatum"},
  {"text": "Instant confirmation", "text_de": "Sofortige Bestätigung"},
  {"text": "No payment required", "text_de": "Keine Zahlung erforderlich"}
]'::jsonb;

-- ============================================================================
-- 2. UPDATE STORE_SETTINGS TABLE
-- ============================================================================

ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS allow_redeem_bookings BOOLEAN DEFAULT true;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN store_content.redeem_card_title IS 'Title for redeem voucher card on homepage (English)';
COMMENT ON COLUMN store_content.redeem_card_title_de IS 'Title for redeem voucher card on homepage (German)';
COMMENT ON COLUMN store_content.redeem_card_subtitle IS 'Subtitle for redeem voucher card on homepage (English)';
COMMENT ON COLUMN store_content.redeem_card_subtitle_de IS 'Subtitle for redeem voucher card on homepage (German)';
COMMENT ON COLUMN store_content.redeem_card_description IS 'Description for redeem voucher card on homepage (English)';
COMMENT ON COLUMN store_content.redeem_card_description_de IS 'Description for redeem voucher card on homepage (German)';
COMMENT ON COLUMN store_content.redeem_card_features IS 'Array of feature objects for redeem card: [{"text": "...", "text_de": "..."}]';
COMMENT ON COLUMN store_settings.allow_redeem_bookings IS 'Enable/disable the redeem voucher card on the store homepage';
