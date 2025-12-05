-- Migration: Add logo_url to pdf_design_templates
-- Description: Adds logo_url field to store logo image URLs for PDF templates

-- Add logo_url column to pdf_design_templates table
ALTER TABLE pdf_design_templates
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add comment
COMMENT ON COLUMN pdf_design_templates.logo_url IS 'URL to the logo image file from template_assets or external source';
