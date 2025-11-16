-- Add subcategory_id column to documents table
-- This allows users to specify the specific type/class of document
-- (e.g., PPL vs CPL for licenses, Class 1 vs Class 2 for medical certificates)

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES document_subcategories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_subcategory ON documents(subcategory_id);

COMMENT ON COLUMN documents.subcategory_id IS 'Optional subcategory for more specific document classification (e.g., PPL vs CPL, Class 1 vs Class 2 Medical)';
