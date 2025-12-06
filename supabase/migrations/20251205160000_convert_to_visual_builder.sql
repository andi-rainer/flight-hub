-- Migration: Convert PDF templates to visual builder with drag & drop elements
-- Description: Restructures templates to use an element-based system instead of fixed layouts

-- Remove layout_type and old configuration fields
ALTER TABLE pdf_design_templates
  DROP COLUMN IF EXISTS layout_type,
  DROP COLUMN IF EXISTS text_overlay_enabled,
  DROP COLUMN IF EXISTS text_overlay_color,
  DROP COLUMN IF EXISTS text_overlay_position,
  DROP COLUMN IF EXISTS logo_position,
  DROP COLUMN IF EXISTS logo_enabled,
  DROP COLUMN IF EXISTS logo_url,
  DROP COLUMN IF EXISTS decorative_images,
  DROP COLUMN IF EXISTS text_zones,
  DROP COLUMN IF EXISTS content_zones,
  DROP COLUMN IF EXISTS qr_config;

-- Add new element-based system
ALTER TABLE pdf_design_templates
  ADD COLUMN IF NOT EXISTS elements JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS canvas_width INTEGER DEFAULT 595,
  ADD COLUMN IF NOT EXISTS canvas_height INTEGER DEFAULT 842;

-- Add comments
COMMENT ON COLUMN pdf_design_templates.elements IS 'Array of draggable elements on the canvas: text, image, qr, line, etc. Each has type, position {x,y}, size {width,height}, layer, and type-specific properties';
COMMENT ON COLUMN pdf_design_templates.canvas_width IS 'Canvas width in pixels (default 595 = A4 width)';
COMMENT ON COLUMN pdf_design_templates.canvas_height IS 'Canvas height in pixels (default 842 = A4 height, can be reduced for ticket-style)';

-- Keep these existing fields as they're still useful for global styling
-- background_image_url, background_opacity, background_position
-- font_config (default fonts)
-- border_config
-- layout_config (colors)
-- show_recipient_name, show_cut_line, page_height_percentage
