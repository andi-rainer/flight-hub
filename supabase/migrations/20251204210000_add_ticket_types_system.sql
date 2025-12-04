-- ============================================================================
-- TICKET TYPES SYSTEM
-- ============================================================================
-- This migration adds a ticket_types table to allow defining different
-- booking options with different prices (e.g., with/without video/photos).
-- Similar to voucher_types but for direct bookings.
-- ============================================================================

-- ============================================================================
-- 1. CREATE TICKET_TYPES TABLE
-- ============================================================================

CREATE TABLE ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL, -- e.g., "TANDEM_STANDARD", "TANDEM_VIDEO"
  code_prefix VARCHAR(10) NOT NULL DEFAULT 'TKT', -- e.g., "TKT", "TV", "TP"

  -- Multilingual names
  name VARCHAR(255) NOT NULL, -- English name
  name_de VARCHAR(255), -- German name

  -- Descriptions
  description TEXT,
  description_de TEXT,

  -- Pricing
  price_eur DECIMAL(10,2) NOT NULL,

  -- Features/inclusions (JSONB array of {text, text_de})
  features JSONB DEFAULT '[]'::jsonb,

  -- Display & Status
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraint for code_prefix format
ALTER TABLE ticket_types
ADD CONSTRAINT check_ticket_type_code_prefix_format
CHECK (code_prefix ~ '^[A-Z0-9]{2,10}$');

-- Add constraint for positive price
ALTER TABLE ticket_types
ADD CONSTRAINT check_ticket_type_price_positive
CHECK (price_eur > 0);

-- Create indexes
CREATE INDEX idx_ticket_types_code ON ticket_types(code);
CREATE INDEX idx_ticket_types_active ON ticket_types(active);
CREATE INDEX idx_ticket_types_sort_order ON ticket_types(sort_order);

-- ============================================================================
-- 2. UPDATE TICKET_BOOKINGS TABLE
-- ============================================================================

-- Add ticket_type_id column to ticket_bookings
ALTER TABLE ticket_bookings
ADD COLUMN IF NOT EXISTS ticket_type_id UUID REFERENCES ticket_types(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_bookings_ticket_type ON ticket_bookings(ticket_type_id);

-- Update the existing voucher_type_id to be more flexible
-- (It can now reference either a voucher type or a ticket type depending on context)
COMMENT ON COLUMN ticket_bookings.voucher_type_id IS 'Voucher type if booking was made with voucher purchase';
COMMENT ON COLUMN ticket_bookings.ticket_type_id IS 'Ticket type selected for direct booking (e.g., with/without video)';

-- ============================================================================
-- 3. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on ticket_types
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;

-- Public read access to active ticket types
CREATE POLICY "Ticket types are publicly readable"
  ON ticket_types
  FOR SELECT
  USING (active = true OR auth.uid() IS NOT NULL);

-- Board members can manage ticket types
CREATE POLICY "Board can manage ticket types"
  ON ticket_types
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND 'board' = ANY(role)
    )
  );

-- ============================================================================
-- 4. UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_ticket_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ticket_types_updated_at
  BEFORE UPDATE ON ticket_types
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_types_updated_at();

-- ============================================================================
-- 5. SEED DEFAULT TICKET TYPES
-- ============================================================================

INSERT INTO ticket_types (code, code_prefix, name, name_de, description, description_de, price_eur, features, sort_order) VALUES
(
  'TANDEM_STANDARD',
  'TKT',
  'Tandem Jump - Standard',
  'Tandemsprung - Standard',
  'Experience the thrill of skydiving with a certified instructor',
  'Erleben Sie den Nervenkitzel des Fallschirmspringens mit einem zertifizierten Instruktor',
  250.00,
  '[
    {"text": "Complete safety briefing", "text_de": "Vollständiges Sicherheitsbriefing"},
    {"text": "Professional tandem instructor", "text_de": "Professioneller Tandem-Instruktor"},
    {"text": "All equipment included", "text_de": "Alle Ausrüstung inbegriffen"},
    {"text": "Jump certificate", "text_de": "Sprungzertifikat"}
  ]'::jsonb,
  1
),
(
  'TANDEM_VIDEO',
  'TV',
  'Tandem Jump - With Video',
  'Tandemsprung - Mit Video',
  'Jump with professional video recording of your entire experience',
  'Sprung mit professioneller Videoaufnahme Ihres gesamten Erlebnisses',
  320.00,
  '[
    {"text": "Everything in Standard package", "text_de": "Alles aus dem Standard-Paket"},
    {"text": "Professional videographer", "text_de": "Professioneller Videograf"},
    {"text": "HD video of your jump", "text_de": "HD-Video Ihres Sprungs"},
    {"text": "Digital download link", "text_de": "Digitaler Download-Link"},
    {"text": "Photos included", "text_de": "Fotos inbegriffen"}
  ]'::jsonb,
  2
),
(
  'TANDEM_PHOTOS',
  'TP',
  'Tandem Jump - With Photos',
  'Tandemsprung - Mit Fotos',
  'Jump with professional photo package',
  'Sprung mit professionellem Foto-Paket',
  290.00,
  '[
    {"text": "Everything in Standard package", "text_de": "Alles aus dem Standard-Paket"},
    {"text": "Professional photographer", "text_de": "Professioneller Fotograf"},
    {"text": "High-resolution photos", "text_de": "Hochauflösende Fotos"},
    {"text": "Digital download link", "text_de": "Digitaler Download-Link"}
  ]'::jsonb,
  3
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE ticket_types IS 'Defines different booking options with varying prices and features (e.g., with/without video)';
COMMENT ON COLUMN ticket_types.code IS 'Unique code identifier for this ticket type';
COMMENT ON COLUMN ticket_types.code_prefix IS 'Prefix used when generating booking codes for this type (e.g., TKT, TV, TP)';
COMMENT ON COLUMN ticket_types.features IS 'JSON array of features/inclusions with English and German text';
COMMENT ON COLUMN ticket_types.price_eur IS 'Price in EUR for this ticket type';
