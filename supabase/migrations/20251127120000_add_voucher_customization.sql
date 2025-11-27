-- ============================================================================
-- ADD VOUCHER CUSTOMIZATION FEATURES
-- ============================================================================
-- Adds ability to customize voucher type features and info section

-- Add custom features field to voucher_types
-- Features will be an array of objects like: [{"text": "...", "text_de": "..."}]
ALTER TABLE voucher_types
  ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb;

-- Add voucher info section fields to store_content
-- This is the "What's Included?" section that appears below all voucher cards
ALTER TABLE store_content
  ADD COLUMN IF NOT EXISTS voucher_info_title TEXT NOT NULL DEFAULT 'What''s Included?',
  ADD COLUMN IF NOT EXISTS voucher_info_title_de TEXT NOT NULL DEFAULT 'Was ist enthalten?',
  ADD COLUMN IF NOT EXISTS voucher_info_section1_title TEXT NOT NULL DEFAULT 'Digital Voucher',
  ADD COLUMN IF NOT EXISTS voucher_info_section1_title_de TEXT NOT NULL DEFAULT 'Digitaler Gutschein',
  ADD COLUMN IF NOT EXISTS voucher_info_section1_features JSONB DEFAULT '[
    {"text": "Instant email delivery", "text_de": "Sofortige E-Mail-Zustellung"},
    {"text": "Printable PDF with QR code", "text_de": "Druckbares PDF mit QR-Code"},
    {"text": "Unique voucher code", "text_de": "Einzigartiger Gutscheincode"},
    {"text": "Easy redemption process", "text_de": "Einfacher Einlösungsprozess"}
  ]'::jsonb,
  ADD COLUMN IF NOT EXISTS voucher_info_section2_title TEXT NOT NULL DEFAULT 'The Experience',
  ADD COLUMN IF NOT EXISTS voucher_info_section2_title_de TEXT NOT NULL DEFAULT 'Das Erlebnis',
  ADD COLUMN IF NOT EXISTS voucher_info_section2_features JSONB DEFAULT '[
    {"text": "Professional tandem instructor", "text_de": "Professioneller Tandem-Lehrer"},
    {"text": "All safety equipment", "text_de": "Komplette Sicherheitsausrüstung"},
    {"text": "Pre-jump training session", "text_de": "Einweisung vor dem Sprung"},
    {"text": "Certificate of completion", "text_de": "Teilnahmezertifikat"}
  ]'::jsonb;

-- Add booking page customization fields to store_content
ALTER TABLE store_content
  ADD COLUMN IF NOT EXISTS bookings_page_title TEXT NOT NULL DEFAULT 'Book Your Experience',
  ADD COLUMN IF NOT EXISTS bookings_page_title_de TEXT NOT NULL DEFAULT 'Buche dein Erlebnis',
  ADD COLUMN IF NOT EXISTS bookings_page_subtitle TEXT NOT NULL DEFAULT 'Choose your preferred date and time',
  ADD COLUMN IF NOT EXISTS bookings_page_subtitle_de TEXT NOT NULL DEFAULT 'Wähle dein bevorzugtes Datum und Uhrzeit',
  ADD COLUMN IF NOT EXISTS bookings_card_header TEXT NOT NULL DEFAULT 'Tandem Skydive Experience',
  ADD COLUMN IF NOT EXISTS bookings_card_header_de TEXT NOT NULL DEFAULT 'Tandem Fallschirmsprung Erlebnis',
  ADD COLUMN IF NOT EXISTS bookings_info_title TEXT NOT NULL DEFAULT 'Booking Information',
  ADD COLUMN IF NOT EXISTS bookings_info_title_de TEXT NOT NULL DEFAULT 'Buchungsinformationen',
  ADD COLUMN IF NOT EXISTS bookings_info_section1_title TEXT NOT NULL DEFAULT 'What to Expect',
  ADD COLUMN IF NOT EXISTS bookings_info_section1_title_de TEXT NOT NULL DEFAULT 'Was dich erwartet',
  ADD COLUMN IF NOT EXISTS bookings_info_section1_features JSONB DEFAULT '[
    {"text": "Arrival 30 minutes before start time", "text_de": "Ankunft 30 Minuten vor Beginn"},
    {"text": "Safety briefing & equipment fitting", "text_de": "Sicherheitseinweisung & Ausrüstung"},
    {"text": "Tandem jump with certified instructor", "text_de": "Tandemsprung mit zertifiziertem Lehrer"},
    {"text": "Digital photos & videos available", "text_de": "Digitale Fotos & Videos verfügbar"}
  ]'::jsonb,
  ADD COLUMN IF NOT EXISTS bookings_info_section2_title TEXT NOT NULL DEFAULT 'Important Notes',
  ADD COLUMN IF NOT EXISTS bookings_info_section2_title_de TEXT NOT NULL DEFAULT 'Wichtige Hinweise',
  ADD COLUMN IF NOT EXISTS bookings_info_section2_features JSONB DEFAULT '[
    {"text": "Weather dependent (reschedule if needed)", "text_de": "Wetterabhängig (Umplanung möglich)"},
    {"text": "Minimum age: 16 years", "text_de": "Mindestalter: 16 Jahre"},
    {"text": "Maximum weight: 100kg", "text_de": "Maximalgewicht: 100kg"},
    {"text": "Medical clearance may be required", "text_de": "Ärztliche Freigabe kann erforderlich sein"}
  ]'::jsonb;

-- Add comment to explain the JSONB structure
COMMENT ON COLUMN voucher_types.features IS 'Array of feature objects with format: [{"text": "English text", "text_de": "German text"}]';
COMMENT ON COLUMN store_content.voucher_info_section1_features IS 'Array of feature objects with format: [{"text": "English text", "text_de": "German text"}]';
COMMENT ON COLUMN store_content.voucher_info_section2_features IS 'Array of feature objects with format: [{"text": "English text", "text_de": "German text"}]';
