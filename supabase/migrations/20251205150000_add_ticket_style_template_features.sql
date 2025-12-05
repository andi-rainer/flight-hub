-- Migration: Add ticket-style template features
-- Description: Adds support for ticket-style vouchers with cut-lines, recipient names, moveable text zones, and CMS-driven descriptions

-- Add voucher description fields to store_content
ALTER TABLE store_content
  ADD COLUMN IF NOT EXISTS pdf_voucher_description TEXT,
  ADD COLUMN IF NOT EXISTS pdf_voucher_description_de TEXT;

-- Add comments for new store_content fields
COMMENT ON COLUMN store_content.pdf_voucher_description IS 'Default voucher description text (English) shown on PDF vouchers';
COMMENT ON COLUMN store_content.pdf_voucher_description_de IS 'Default voucher description text (German) shown on PDF vouchers';

-- Add ticket-style fields to pdf_design_templates
ALTER TABLE pdf_design_templates
  ADD COLUMN IF NOT EXISTS show_recipient_name BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_cut_line BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS page_height_percentage INTEGER DEFAULT 100 CHECK (page_height_percentage > 0 AND page_height_percentage <= 100),
  ADD COLUMN IF NOT EXISTS text_zones JSONB DEFAULT '{}'::jsonb;

-- Add comments for new template fields
COMMENT ON COLUMN pdf_design_templates.show_recipient_name IS 'Whether to display the recipient name on the voucher';
COMMENT ON COLUMN pdf_design_templates.show_cut_line IS 'Whether to show a cut-line for ticket-style vouchers';
COMMENT ON COLUMN pdf_design_templates.page_height_percentage IS 'Percentage of page height to use (for ticket-style vouchers that use less than full page)';
COMMENT ON COLUMN pdf_design_templates.text_zones IS 'Configurable text zones with positions: {description: {x, y, width, height, fontSize}, recipient: {x, y, fontSize}, etc}';
