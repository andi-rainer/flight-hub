-- PDF Voucher/Ticket Enhancement Migration
-- Adds support for multilingual PDFs, custom designs, and personalization

-- ============================================================================
-- 1. Add PDF Configuration to store_content
-- ============================================================================

-- Logo
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS pdf_logo_url TEXT;

-- Contact Information (bilingual)
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS pdf_contact_phone TEXT DEFAULT '+43 123 456789';
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS pdf_contact_phone_de TEXT;
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS pdf_contact_email TEXT DEFAULT 'info@skydive-salzburg.com';
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS pdf_contact_email_de TEXT;
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS pdf_contact_website TEXT DEFAULT 'www.skydive-salzburg.com';
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS pdf_contact_website_de TEXT;
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS pdf_contact_address TEXT;
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS pdf_contact_address_de TEXT;

-- PDF Labels (bilingual)
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS pdf_label_voucher_code TEXT DEFAULT 'Voucher Code';
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS pdf_label_voucher_code_de TEXT DEFAULT 'Gutschein-Code';
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS pdf_label_booking_code TEXT DEFAULT 'Booking Code';
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS pdf_label_booking_code_de TEXT DEFAULT 'Buchungscode';
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS pdf_label_valid_until TEXT DEFAULT 'Valid Until';
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS pdf_label_valid_until_de TEXT DEFAULT 'Gültig bis';
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS pdf_label_redeem_instructions TEXT DEFAULT 'Scan QR code or visit our website to redeem';
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS pdf_label_redeem_instructions_de TEXT DEFAULT 'QR-Code scannen oder Website besuchen zum Einlösen';
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS pdf_label_terms TEXT DEFAULT 'Terms & Conditions apply. See website for details.';
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS pdf_label_terms_de TEXT DEFAULT 'Es gelten die AGB. Details auf der Website.';
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS pdf_label_personal_message TEXT DEFAULT 'Personal Message';
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS pdf_label_personal_message_de TEXT DEFAULT 'Persönliche Nachricht';
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS pdf_label_from TEXT DEFAULT 'From';
ALTER TABLE store_content ADD COLUMN IF NOT EXISTS pdf_label_from_de TEXT DEFAULT 'Von';

-- ============================================================================
-- 2. Create PDF Design Templates Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS pdf_design_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_de TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL, -- 'classic', 'modern', 'elegant', etc.
  description TEXT,
  description_de TEXT,
  preview_image_url TEXT,
  layout_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- Colors, fonts, positioning
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for active templates
CREATE INDEX IF NOT EXISTS idx_pdf_templates_active ON pdf_design_templates(active, sort_order);

-- Insert default templates
INSERT INTO pdf_design_templates (name, name_de, code, description, description_de, layout_config, sort_order, active) VALUES
(
  'Classic',
  'Klassisch',
  'classic',
  'Traditional design with elegant styling',
  'Traditionelles Design mit elegantem Stil',
  '{
    "primaryColor": "#1e40af",
    "secondaryColor": "#3b82f6",
    "accentColor": "#60a5fa",
    "textColor": "#1f2937",
    "backgroundColor": "#ffffff",
    "headerHeight": 80,
    "qrPosition": "right",
    "qrSize": 80,
    "fontFamily": "helvetica",
    "headerFont": "helvetica-bold"
  }'::jsonb,
  1,
  true
),
(
  'Modern',
  'Modern',
  'modern',
  'Contemporary design with bold colors',
  'Zeitgenössisches Design mit kräftigen Farben',
  '{
    "primaryColor": "#7c3aed",
    "secondaryColor": "#a78bfa",
    "accentColor": "#c4b5fd",
    "textColor": "#111827",
    "backgroundColor": "#ffffff",
    "headerHeight": 100,
    "qrPosition": "bottom",
    "qrSize": 90,
    "fontFamily": "helvetica",
    "headerFont": "helvetica-bold"
  }'::jsonb,
  2,
  true
),
(
  'Elegant',
  'Elegant',
  'elegant',
  'Sophisticated design with refined details',
  'Raffiniertes Design mit feinen Details',
  '{
    "primaryColor": "#059669",
    "secondaryColor": "#10b981",
    "accentColor": "#34d399",
    "textColor": "#0f172a",
    "backgroundColor": "#ffffff",
    "headerHeight": 90,
    "qrPosition": "right",
    "qrSize": 85,
    "fontFamily": "times",
    "headerFont": "times-bold"
  }'::jsonb,
  3,
  true
);

-- ============================================================================
-- 3. Update vouchers and ticket_types tables
-- ============================================================================

-- Add fields to vouchers
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en' CHECK (language IN ('en', 'de'));
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS design_template_id UUID REFERENCES pdf_design_templates(id);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS custom_message TEXT;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS custom_message_from TEXT;

-- Add fields to ticket_types (for when tickets are sold)
-- Note: tickets table doesn't exist yet, but preparing structure
COMMENT ON COLUMN vouchers.language IS 'Language preference for PDF generation (en or de)';
COMMENT ON COLUMN vouchers.design_template_id IS 'Selected PDF design template';
COMMENT ON COLUMN vouchers.custom_message IS 'Personalized message from buyer to recipient';
COMMENT ON COLUMN vouchers.custom_message_from IS 'Name of person who wrote the custom message';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vouchers_language ON vouchers(language);
CREATE INDEX IF NOT EXISTS idx_vouchers_design_template ON vouchers(design_template_id);

-- ============================================================================
-- 4. RLS Policies for pdf_design_templates
-- ============================================================================

-- Enable RLS
ALTER TABLE pdf_design_templates ENABLE ROW LEVEL SECURITY;

-- Public can view active templates
CREATE POLICY "Public can view active templates"
  ON pdf_design_templates
  FOR SELECT
  USING (active = true);

-- Board members can manage templates
CREATE POLICY "Board members can manage templates"
  ON pdf_design_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'board' = ANY(users.role)
    )
  );

-- ============================================================================
-- 5. Helper Function to Get Default Template
-- ============================================================================

CREATE OR REPLACE FUNCTION get_default_pdf_template()
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  template_id UUID;
BEGIN
  -- Get the first active template by sort order
  SELECT id INTO template_id
  FROM pdf_design_templates
  WHERE active = true
  ORDER BY sort_order, created_at
  LIMIT 1;

  RETURN template_id;
END;
$$;

-- ============================================================================
-- 6. Update existing vouchers with default template
-- ============================================================================

-- Set default template for existing vouchers
UPDATE vouchers
SET design_template_id = get_default_pdf_template()
WHERE design_template_id IS NULL;

-- ============================================================================
-- 7. Create Supabase Storage Bucket for PDF Assets (if not exists)
-- ============================================================================

-- Note: Storage buckets are created via Supabase dashboard or API
-- This is a comment reminder to create the 'pdf-assets' bucket
-- with public access for logos

COMMENT ON TABLE pdf_design_templates IS 'PDF design templates for vouchers and tickets. Contains layout configuration and styling.';
COMMENT ON TABLE store_content IS 'Updated with PDF configuration fields for contact info, labels, and logo URL';
