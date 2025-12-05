-- Add PDF template selection to vouchers table
-- Allows tracking which template was selected during purchase

ALTER TABLE vouchers
  ADD COLUMN IF NOT EXISTS pdf_template_id UUID REFERENCES pdf_design_templates(id) ON DELETE SET NULL;

-- Create index for faster template lookups
CREATE INDEX IF NOT EXISTS idx_vouchers_pdf_template ON vouchers(pdf_template_id);

COMMENT ON COLUMN vouchers.pdf_template_id IS 'The PDF template selected by the buyer during purchase (optional, can be null for legacy vouchers)';
