-- ============================================================================
-- STORE CMS SYSTEM
-- ============================================================================
-- This migration creates a content management system for the tandem store,
-- allowing board members to customize all customer-facing text.
--
-- Features:
-- - Flexible feature lists (JSONB arrays)
-- - Bilingual content (EN/DE)
-- - Terms & Conditions links
-- - Public read, board-only write

-- ============================================================================
-- STORE CONTENT TABLE
-- ============================================================================

CREATE TABLE store_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Home Page
  home_title TEXT NOT NULL DEFAULT 'Tandem Skydive Experience',
  home_title_de TEXT NOT NULL DEFAULT 'Tandem Fallschirmsprung Erlebnis',
  home_subtitle TEXT NOT NULL DEFAULT 'Book your unforgettable tandem skydive or purchase a gift voucher for someone special',
  home_subtitle_de TEXT NOT NULL DEFAULT 'Buchen Sie Ihren unvergesslichen Tandemsprung oder kaufen Sie einen Geschenkgutschein',

  -- Voucher Card
  voucher_card_title TEXT NOT NULL DEFAULT 'Buy a Voucher',
  voucher_card_title_de TEXT NOT NULL DEFAULT 'Gutschein kaufen',
  voucher_card_description TEXT NOT NULL DEFAULT 'Perfect gift for adventure seekers. Valid for one year from purchase date.',
  voucher_card_description_de TEXT NOT NULL DEFAULT 'Das perfekte Geschenk für Abenteuerlustige. Gültig für ein Jahr ab Kaufdatum.',
  voucher_card_features JSONB NOT NULL DEFAULT '[
    {"text": "Choose from different jump heights", "text_de": "Wählen Sie aus verschiedenen Sprunghöhen"},
    {"text": "Recipient can schedule at their convenience", "text_de": "Empfänger kann bequem selbst planen"},
    {"text": "Instant digital delivery via email", "text_de": "Sofortige digitale Zustellung per E-Mail"},
    {"text": "Printable PDF with unique QR code", "text_de": "Druckbares PDF mit einzigartigem QR-Code"}
  ]'::jsonb,

  -- Booking Card
  booking_card_title TEXT NOT NULL DEFAULT 'Book a Date',
  booking_card_title_de TEXT NOT NULL DEFAULT 'Datum buchen',
  booking_card_description TEXT NOT NULL DEFAULT 'Reserve your spot on a specific operation day. Limited availability.',
  booking_card_description_de TEXT NOT NULL DEFAULT 'Reservieren Sie Ihren Platz an einem bestimmten Betriebstag. Begrenzte Verfügbarkeit.',
  booking_card_features JSONB NOT NULL DEFAULT '[
    {"text": "See real-time availability", "text_de": "Echtzeit-Verfügbarkeit anzeigen"},
    {"text": "Guaranteed jump on your chosen date", "text_de": "Garantierter Sprung an Ihrem Wunschdatum"},
    {"text": "Instant booking confirmation", "text_de": "Sofortige Buchungsbestätigung"},
    {"text": "E-ticket with QR code sent to email", "text_de": "E-Ticket mit QR-Code per E-Mail"}
  ]'::jsonb,

  -- Footer
  footer_pricing TEXT NOT NULL DEFAULT 'All prices include VAT. Secure payment powered by Stripe.',
  footer_pricing_de TEXT NOT NULL DEFAULT 'Alle Preise inkl. MwSt. Sichere Zahlung über Stripe.',
  footer_contact TEXT NOT NULL DEFAULT 'Questions? Contact us at info@skydive-salzburg.com',
  footer_contact_de TEXT NOT NULL DEFAULT 'Fragen? Kontaktieren Sie uns unter info@skydive-salzburg.com',

  -- Vouchers Page
  vouchers_page_title TEXT NOT NULL DEFAULT 'Choose Your Voucher',
  vouchers_page_title_de TEXT NOT NULL DEFAULT 'Wählen Sie Ihren Gutschein',
  vouchers_page_subtitle TEXT NOT NULL DEFAULT 'Select the perfect tandem skydive experience',
  vouchers_page_subtitle_de TEXT NOT NULL DEFAULT 'Wählen Sie das perfekte Tandemsprung-Erlebnis',

  -- Terms & Conditions
  terms_url TEXT,
  terms_url_de TEXT,
  show_terms_on_checkout BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_store_content_updated_at
  BEFORE UPDATE ON store_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DEFAULT CONTENT
-- ============================================================================

INSERT INTO store_content (id) VALUES (gen_random_uuid());

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE store_content ENABLE ROW LEVEL SECURITY;

-- Public can read store content
CREATE POLICY "Public can view store content"
  ON store_content FOR SELECT
  USING (true);

-- Board members can update store content
CREATE POLICY "Board can update store content"
  ON store_content FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND 'board' = ANY(role)
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE store_content IS 'CMS for tandem store customer-facing content';
COMMENT ON COLUMN store_content.voucher_card_features IS 'Array of feature objects: [{"text": "...", "text_de": "..."}]';
COMMENT ON COLUMN store_content.booking_card_features IS 'Array of feature objects: [{"text": "...", "text_de": "..."}]';
COMMENT ON COLUMN store_content.terms_url IS 'URL to terms & conditions page (English)';
COMMENT ON COLUMN store_content.terms_url_de IS 'URL to terms & conditions page (German, falls back to EN if null)';
