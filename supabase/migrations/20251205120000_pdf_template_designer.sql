-- PDF Template Designer Enhancement Migration
-- Extends pdf_design_templates with visual designer capabilities

-- ============================================================================
-- 1. Add Visual Designer Fields to pdf_design_templates
-- ============================================================================

-- Layout system
ALTER TABLE pdf_design_templates ADD COLUMN IF NOT EXISTS layout_type TEXT DEFAULT 'ticket' CHECK (layout_type IN ('ticket', 'full-photo', 'certificate', 'minimal'));

-- Background image
ALTER TABLE pdf_design_templates ADD COLUMN IF NOT EXISTS background_image_url TEXT;
ALTER TABLE pdf_design_templates ADD COLUMN IF NOT EXISTS background_opacity NUMERIC DEFAULT 1.0 CHECK (background_opacity >= 0 AND background_opacity <= 1);
ALTER TABLE pdf_design_templates ADD COLUMN IF NOT EXISTS background_position TEXT DEFAULT 'center' CHECK (background_position IN ('center', 'top', 'bottom', 'left', 'right', 'stretch'));

-- Logo positioning
ALTER TABLE pdf_design_templates ADD COLUMN IF NOT EXISTS logo_position JSONB DEFAULT '{"x": 50, "y": 30, "width": 120, "height": 60}'::jsonb;
ALTER TABLE pdf_design_templates ADD COLUMN IF NOT EXISTS logo_enabled BOOLEAN DEFAULT true;

-- Text overlay (for photo backgrounds)
ALTER TABLE pdf_design_templates ADD COLUMN IF NOT EXISTS text_overlay_enabled BOOLEAN DEFAULT false;
ALTER TABLE pdf_design_templates ADD COLUMN IF NOT EXISTS text_overlay_color TEXT DEFAULT 'rgba(0,0,0,0.5)';
ALTER TABLE pdf_design_templates ADD COLUMN IF NOT EXISTS text_overlay_position JSONB DEFAULT '{"x": 0, "y": 0, "width": "100%", "height": 200}'::jsonb;

-- Decorative images (multiple)
ALTER TABLE pdf_design_templates ADD COLUMN IF NOT EXISTS decorative_images JSONB DEFAULT '[]'::jsonb;
-- Format: [{"url": "...", "x": 100, "y": 50, "width": 80, "height": 80, "name": "parachute"}, ...]

-- QR code positioning and styling
ALTER TABLE pdf_design_templates ADD COLUMN IF NOT EXISTS qr_config JSONB DEFAULT '{
  "position": "right",
  "x": 450,
  "y": 200,
  "size": 80,
  "backgroundColor": "#ffffff",
  "foregroundColor": "#000000",
  "includeMargin": true
}'::jsonb;

-- Typography
ALTER TABLE pdf_design_templates ADD COLUMN IF NOT EXISTS font_config JSONB DEFAULT '{
  "titleFont": "helvetica-bold",
  "titleSize": 24,
  "titleColor": "#1f2937",
  "bodyFont": "helvetica",
  "bodySize": 12,
  "bodyColor": "#4b5563",
  "labelFont": "helvetica-bold",
  "labelSize": 10,
  "labelColor": "#6b7280"
}'::jsonb;

-- Border and decoration
ALTER TABLE pdf_design_templates ADD COLUMN IF NOT EXISTS border_config JSONB DEFAULT '{
  "enabled": false,
  "style": "solid",
  "width": 2,
  "color": "#e5e7eb",
  "cornerRadius": 0,
  "decorative": false
}'::jsonb;

-- Content positioning zones
ALTER TABLE pdf_design_templates ADD COLUMN IF NOT EXISTS content_zones JSONB DEFAULT '{
  "header": {"x": 50, "y": 50, "width": 500, "height": 80},
  "body": {"x": 50, "y": 150, "width": 500, "height": 400},
  "footer": {"x": 50, "y": 570, "width": 500, "height": 50}
}'::jsonb;

-- Page dimensions (A4 by default in points: 595.28 x 841.89)
ALTER TABLE pdf_design_templates ADD COLUMN IF NOT EXISTS page_config JSONB DEFAULT '{
  "width": 595.28,
  "height": 841.89,
  "orientation": "portrait",
  "margins": {"top": 40, "right": 40, "bottom": 40, "left": 40}
}'::jsonb;

-- ============================================================================
-- 2. Update existing templates with enhanced configurations
-- ============================================================================

-- Classic Template (Ticket Style)
UPDATE pdf_design_templates
SET
  layout_type = 'ticket',
  logo_position = '{"x": 50, "y": 30, "width": 100, "height": 50}'::jsonb,
  qr_config = '{
    "position": "right",
    "x": 450,
    "y": 200,
    "size": 90,
    "backgroundColor": "#ffffff",
    "foregroundColor": "#1e40af",
    "includeMargin": true
  }'::jsonb,
  border_config = '{
    "enabled": true,
    "style": "solid",
    "width": 3,
    "color": "#3b82f6",
    "cornerRadius": 8,
    "decorative": true
  }'::jsonb,
  font_config = '{
    "titleFont": "helvetica-bold",
    "titleSize": 28,
    "titleColor": "#1e40af",
    "bodyFont": "helvetica",
    "bodySize": 12,
    "bodyColor": "#1f2937",
    "labelFont": "helvetica-bold",
    "labelSize": 11,
    "labelColor": "#3b82f6"
  }'::jsonb,
  content_zones = '{
    "header": {"x": 60, "y": 50, "width": 350, "height": 100},
    "body": {"x": 60, "y": 170, "width": 350, "height": 350},
    "footer": {"x": 60, "y": 540, "width": 480, "height": 60}
  }'::jsonb
WHERE code = 'classic';

-- Modern Template (Full-Photo Style)
UPDATE pdf_design_templates
SET
  layout_type = 'full-photo',
  logo_position = '{"x": 40, "y": 40, "width": 120, "height": 60}'::jsonb,
  text_overlay_enabled = true,
  text_overlay_color = 'rgba(0,0,0,0.6)',
  text_overlay_position = '{"x": 0, "y": 500, "width": "100%", "height": 342}'::jsonb,
  qr_config = '{
    "position": "bottom",
    "x": 450,
    "y": 700,
    "size": 85,
    "backgroundColor": "#ffffff",
    "foregroundColor": "#7c3aed",
    "includeMargin": true
  }'::jsonb,
  border_config = '{
    "enabled": false,
    "style": "none",
    "width": 0,
    "color": "#ffffff",
    "cornerRadius": 0,
    "decorative": false
  }'::jsonb,
  font_config = '{
    "titleFont": "helvetica-bold",
    "titleSize": 32,
    "titleColor": "#ffffff",
    "bodyFont": "helvetica",
    "bodySize": 14,
    "bodyColor": "#f3f4f6",
    "labelFont": "helvetica-bold",
    "labelSize": 11,
    "labelColor": "#e0e7ff"
  }'::jsonb,
  content_zones = '{
    "header": {"x": 60, "y": 530, "width": 480, "height": 120},
    "body": {"x": 60, "y": 660, "width": 350, "height": 150},
    "footer": {"x": 60, "y": 780, "width": 480, "height": 50}
  }'::jsonb
WHERE code = 'modern';

-- Elegant Template (Certificate Style)
UPDATE pdf_design_templates
SET
  layout_type = 'certificate',
  logo_position = '{"x": 247, "y": 50, "width": 100, "height": 50}'::jsonb,
  qr_config = '{
    "position": "right",
    "x": 460,
    "y": 700,
    "size": 80,
    "backgroundColor": "#ffffff",
    "foregroundColor": "#059669",
    "includeMargin": true
  }'::jsonb,
  border_config = '{
    "enabled": true,
    "style": "double",
    "width": 2,
    "color": "#10b981",
    "cornerRadius": 4,
    "decorative": true
  }'::jsonb,
  font_config = '{
    "titleFont": "times-bold",
    "titleSize": 30,
    "titleColor": "#059669",
    "bodyFont": "times",
    "bodySize": 13,
    "bodyColor": "#0f172a",
    "labelFont": "times-bold",
    "labelSize": 11,
    "labelColor": "#10b981"
  }'::jsonb,
  content_zones = '{
    "header": {"x": 100, "y": 130, "width": 395, "height": 100},
    "body": {"x": 100, "y": 250, "width": 395, "height": 400},
    "footer": {"x": 100, "y": 670, "width": 395, "height": 100}
  }'::jsonb
WHERE code = 'elegant';

-- ============================================================================
-- 3. Create template_assets table for managing images
-- ============================================================================

CREATE TABLE IF NOT EXISTS template_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('background', 'decorative', 'logo', 'border')),
  file_url TEXT NOT NULL,
  file_size INTEGER, -- in bytes
  file_type TEXT, -- mime type
  width INTEGER,
  height INTEGER,
  thumbnail_url TEXT,
  tags TEXT[], -- for filtering (e.g., 'parachute', 'airplane', 'sky', 'action')
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for asset queries
CREATE INDEX IF NOT EXISTS idx_template_assets_type ON template_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_template_assets_tags ON template_assets USING GIN(tags);

-- ============================================================================
-- 4. RLS Policies for template_assets
-- ============================================================================

ALTER TABLE template_assets ENABLE ROW LEVEL SECURITY;

-- Public can view all assets (for template previews)
CREATE POLICY "Public can view assets"
  ON template_assets
  FOR SELECT
  USING (true);

-- Board members can manage assets
CREATE POLICY "Board members can manage assets"
  ON template_assets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'board' = ANY(users.role)
    )
  );

-- ============================================================================
-- 5. Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN pdf_design_templates.layout_type IS 'Visual layout style: ticket, full-photo, certificate, minimal';
COMMENT ON COLUMN pdf_design_templates.background_image_url IS 'URL to background image (for full-photo layouts)';
COMMENT ON COLUMN pdf_design_templates.decorative_images IS 'Array of decorative image objects with positions';
COMMENT ON COLUMN pdf_design_templates.logo_position IS 'Logo position and dimensions {x, y, width, height}';
COMMENT ON COLUMN pdf_design_templates.qr_config IS 'QR code configuration: position, size, colors';
COMMENT ON COLUMN pdf_design_templates.font_config IS 'Typography settings for titles, body, labels';
COMMENT ON COLUMN pdf_design_templates.border_config IS 'Border and decoration styling';
COMMENT ON COLUMN pdf_design_templates.content_zones IS 'Positioning zones for header, body, footer content';
COMMENT ON COLUMN pdf_design_templates.page_config IS 'Page dimensions, orientation, margins';

COMMENT ON TABLE template_assets IS 'Asset library for PDF template designer: backgrounds, decorative images, logos';
