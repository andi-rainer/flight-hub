-- Update PDF template structure
-- 1. Remove template_code and name_de
-- 2. Change layout_type to template_type with enum (voucher/ticket)

-- Add template_type enum
CREATE TYPE template_type AS ENUM ('voucher', 'ticket');

-- Add new template_type column
ALTER TABLE pdf_design_templates
  ADD COLUMN IF NOT EXISTS template_type template_type DEFAULT 'voucher';

-- Update existing templates based on old layout_type or default to voucher
UPDATE pdf_design_templates
SET template_type = 'voucher'
WHERE template_type IS NULL;

-- Drop old columns
ALTER TABLE pdf_design_templates
  DROP COLUMN IF EXISTS template_code,
  DROP COLUMN IF EXISTS name_de,
  DROP COLUMN IF EXISTS layout_type;

-- Make template_type required
ALTER TABLE pdf_design_templates
  ALTER COLUMN template_type SET NOT NULL;
