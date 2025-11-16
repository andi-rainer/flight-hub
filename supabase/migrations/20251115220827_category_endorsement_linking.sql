-- ============================================================================
-- Category-Endorsement Linking System
-- ============================================================================
-- This migration creates a many-to-many relationship between document_categories
-- and endorsements, allowing categories to define which endorsements are
-- applicable for documents in that category.
-- ============================================================================

-- Junction table for category-endorsement relationships
CREATE TABLE IF NOT EXISTS category_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES document_categories(id) ON DELETE CASCADE,
  endorsement_id UUID NOT NULL REFERENCES endorsements(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Prevent duplicate links
  UNIQUE(category_id, endorsement_id)
);

-- Indexes for performance
CREATE INDEX idx_category_endorsements_category ON category_endorsements(category_id);
CREATE INDEX idx_category_endorsements_endorsement ON category_endorsements(endorsement_id);

-- RLS Policies
ALTER TABLE category_endorsements ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read category-endorsement links
CREATE POLICY "Authenticated users can read category endorsements"
  ON category_endorsements FOR SELECT
  TO authenticated
  USING (true);

-- Only board members can manage category-endorsement links
CREATE POLICY "Board members can manage category endorsements"
  ON category_endorsements FOR ALL
  TO authenticated
  USING (is_board_member(auth.uid()))
  WITH CHECK (is_board_member(auth.uid()));

-- Comments
COMMENT ON TABLE category_endorsements IS 'Many-to-many relationship between document categories and endorsements';
COMMENT ON COLUMN category_endorsements.category_id IS 'Document category that can have these endorsements';
COMMENT ON COLUMN category_endorsements.endorsement_id IS 'Endorsement/rating applicable to this category';
