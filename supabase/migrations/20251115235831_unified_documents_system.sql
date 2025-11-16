-- ============================================================================
-- Unified Documents System
-- ============================================================================
-- This migration consolidates document_types and document_categories into a
-- single unified "document_definitions" system. This provides a clearer,
-- more user-friendly way to manage document requirements and endorsements.
-- ============================================================================

-- ============================================================================
-- PART 1: Create New Unified Structure
-- ============================================================================

-- Document Definitions (replaces both document_types and document_categories)
CREATE TABLE IF NOT EXISTS document_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,

  -- Configuration flags
  mandatory BOOLEAN DEFAULT false,
  expires BOOLEAN DEFAULT false,
  has_subcategories BOOLEAN DEFAULT false,
  has_endorsements BOOLEAN DEFAULT false,

  -- Function requirements (which functions need this document)
  required_for_functions TEXT[] DEFAULT ARRAY[]::TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(name)
);

-- Keep document_subcategories but link to document_definitions
-- First, add new column
ALTER TABLE document_subcategories
  ADD COLUMN IF NOT EXISTS document_definition_id UUID REFERENCES document_definitions(id) ON DELETE CASCADE;

-- Rename category_endorsements to definition_endorsements for clarity
CREATE TABLE IF NOT EXISTS definition_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_definition_id UUID NOT NULL REFERENCES document_definitions(id) ON DELETE CASCADE,
  endorsement_id UUID NOT NULL REFERENCES endorsements(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  UNIQUE(document_definition_id, endorsement_id)
);

-- User Document Endorsements (tracks which endorsements a user has per document with expiry)
CREATE TABLE IF NOT EXISTS user_document_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  endorsement_id UUID NOT NULL REFERENCES endorsements(id) ON DELETE CASCADE,

  -- Endorsement expiry date
  expiry_date DATE,

  -- Does user have IR for this endorsement?
  has_ir BOOLEAN DEFAULT false,

  -- IR expiry date (only applicable if has_ir = true and endorsement.supports_ir = true)
  ir_expiry_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(document_id, endorsement_id)
);

-- ============================================================================
-- PART 2: Migrate Existing Data
-- ============================================================================

-- Migrate document_categories to document_definitions
INSERT INTO document_definitions (
  id,
  name,
  description,
  icon,
  sort_order,
  active,
  has_subcategories,
  has_endorsements,
  created_at,
  updated_at
)
SELECT
  id,
  name,
  description,
  icon,
  sort_order,
  active,
  -- Determine if has subcategories by checking if any exist
  EXISTS(SELECT 1 FROM document_subcategories WHERE category_id = document_categories.id),
  -- Determine if has endorsements by checking category_endorsements
  EXISTS(SELECT 1 FROM category_endorsements WHERE category_id = document_categories.id),
  created_at,
  updated_at
FROM document_categories
ON CONFLICT (id) DO NOTHING;

-- Update document_subcategories to point to document_definitions
UPDATE document_subcategories
SET document_definition_id = category_id
WHERE document_definition_id IS NULL;

-- Migrate category_endorsements to definition_endorsements
INSERT INTO definition_endorsements (
  id,
  document_definition_id,
  endorsement_id,
  created_at,
  created_by
)
SELECT
  id,
  category_id,
  endorsement_id,
  created_at,
  created_by
FROM category_endorsements
ON CONFLICT (document_definition_id, endorsement_id) DO NOTHING;

-- Migrate document_types data to document_definitions
-- Link existing document types to their categories and set required_for_functions
INSERT INTO document_definitions (
  name,
  description,
  mandatory,
  expires,
  required_for_functions,
  has_subcategories,
  has_endorsements
)
SELECT
  dt.name,
  dt.description,
  dt.mandatory,
  dt.expires,
  dt.required_for_functions,
  -- Check if the category has subcategories
  COALESCE(
    (SELECT true FROM document_subcategories WHERE category_id = dt.category_id LIMIT 1),
    false
  ),
  -- Check if the category has endorsements
  COALESCE(
    (SELECT true FROM category_endorsements WHERE category_id = dt.category_id LIMIT 1),
    false
  )
FROM document_types dt
WHERE NOT EXISTS (
  SELECT 1 FROM document_definitions dd WHERE dd.name = dt.name
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  mandatory = EXCLUDED.mandatory,
  expires = EXCLUDED.expires,
  required_for_functions = EXCLUDED.required_for_functions;

-- ============================================================================
-- PART 3: Update documents table
-- ============================================================================

-- Add document_definition_id to documents table
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS document_definition_id UUID REFERENCES document_definitions(id);

-- Note: Existing documents will need to be manually linked to document_definitions
-- or through the UI when board members review/approve them

-- ============================================================================
-- PART 4: Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_document_definitions_active ON document_definitions(active);
CREATE INDEX IF NOT EXISTS idx_document_definitions_sort_order ON document_definitions(sort_order);
CREATE INDEX IF NOT EXISTS idx_document_subcategories_definition ON document_subcategories(document_definition_id);
CREATE INDEX IF NOT EXISTS idx_definition_endorsements_definition ON definition_endorsements(document_definition_id);
CREATE INDEX IF NOT EXISTS idx_definition_endorsements_endorsement ON definition_endorsements(endorsement_id);
CREATE INDEX IF NOT EXISTS idx_user_document_endorsements_document ON user_document_endorsements(document_id);
CREATE INDEX IF NOT EXISTS idx_user_document_endorsements_endorsement ON user_document_endorsements(endorsement_id);
CREATE INDEX IF NOT EXISTS idx_documents_definition ON documents(document_definition_id);

-- ============================================================================
-- PART 5: RLS Policies
-- ============================================================================

-- Document Definitions
ALTER TABLE document_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read document definitions"
  ON document_definitions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Board members can manage document definitions"
  ON document_definitions FOR ALL
  TO authenticated
  USING (is_board_member(auth.uid()))
  WITH CHECK (is_board_member(auth.uid()));

-- Definition Endorsements
ALTER TABLE definition_endorsements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read definition endorsements"
  ON definition_endorsements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Board members can manage definition endorsements"
  ON definition_endorsements FOR ALL
  TO authenticated
  USING (is_board_member(auth.uid()))
  WITH CHECK (is_board_member(auth.uid()));

-- User Document Endorsements
ALTER TABLE user_document_endorsements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own document endorsements"
  ON user_document_endorsements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = user_document_endorsements.document_id
        AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Board members can read all document endorsements"
  ON user_document_endorsements FOR SELECT
  TO authenticated
  USING (is_board_member(auth.uid()));

CREATE POLICY "Users can manage own document endorsements"
  ON user_document_endorsements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = user_document_endorsements.document_id
        AND documents.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = user_document_endorsements.document_id
        AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Board members can manage all document endorsements"
  ON user_document_endorsements FOR ALL
  TO authenticated
  USING (is_board_member(auth.uid()))
  WITH CHECK (is_board_member(auth.uid()));

-- ============================================================================
-- PART 6: Triggers
-- ============================================================================

-- Update timestamp trigger for document_definitions
CREATE OR REPLACE FUNCTION update_document_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_document_definitions_updated_at
  BEFORE UPDATE ON document_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_document_definitions_updated_at();

-- Update timestamp trigger for user_document_endorsements
CREATE OR REPLACE FUNCTION update_user_document_endorsements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_document_endorsements_updated_at
  BEFORE UPDATE ON user_document_endorsements
  FOR EACH ROW
  EXECUTE FUNCTION update_user_document_endorsements_updated_at();

-- ============================================================================
-- PART 7: Comments
-- ============================================================================

COMMENT ON TABLE document_definitions IS 'Unified document configuration (replaces document_types and document_categories)';
COMMENT ON COLUMN document_definitions.name IS 'Document name (e.g., "Pilot License", "Medical Certificate")';
COMMENT ON COLUMN document_definitions.mandatory IS 'Whether this document must be uploaded';
COMMENT ON COLUMN document_definitions.expires IS 'Whether this document has an expiry date';
COMMENT ON COLUMN document_definitions.has_subcategories IS 'Whether this document has subcategories (e.g., PPL, CPL, ATPL)';
COMMENT ON COLUMN document_definitions.has_endorsements IS 'Whether this document can have endorsements/ratings';
COMMENT ON COLUMN document_definitions.required_for_functions IS 'Array of function IDs that require this document';

COMMENT ON TABLE definition_endorsements IS 'Which endorsements are applicable for each document definition';

COMMENT ON TABLE user_document_endorsements IS 'Tracks which endorsements/ratings a user has per document with individual expiry dates';
COMMENT ON COLUMN user_document_endorsements.expiry_date IS 'Expiry date for this specific endorsement';
COMMENT ON COLUMN user_document_endorsements.has_ir IS 'Whether user has Instrument Rating for this endorsement';
COMMENT ON COLUMN user_document_endorsements.ir_expiry_date IS 'IR expiry date (only if has_ir = true and endorsement supports IR)';
