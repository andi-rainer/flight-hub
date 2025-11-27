-- ============================================================================
-- ADD MISSING STORE CONTENT FIELDS
-- ============================================================================
-- Adds subtitle fields and renames footer fields to match the CMS design

-- Add subtitle fields for cards
ALTER TABLE store_content
  ADD COLUMN IF NOT EXISTS voucher_card_subtitle TEXT NOT NULL DEFAULT 'Perfect gift for adventurers',
  ADD COLUMN IF NOT EXISTS voucher_card_subtitle_de TEXT NOT NULL DEFAULT 'Perfektes Geschenk für Abenteurer',
  ADD COLUMN IF NOT EXISTS booking_card_subtitle TEXT NOT NULL DEFAULT 'Schedule your jump now',
  ADD COLUMN IF NOT EXISTS booking_card_subtitle_de TEXT NOT NULL DEFAULT 'Jetzt Sprung planen';

-- Rename footer fields to be more generic (single footer field)
ALTER TABLE store_content
  ADD COLUMN IF NOT EXISTS home_footer TEXT NOT NULL DEFAULT 'All prices include VAT. Secure payment powered by Stripe.',
  ADD COLUMN IF NOT EXISTS home_footer_de TEXT NOT NULL DEFAULT 'Alle Preise inkl. MwSt. Sichere Zahlung über Stripe.';

-- Note: We keep the old footer_pricing and footer_contact columns for backward compatibility
-- They can be manually dropped later if needed
