-- Migration: Document Privilege/Endorsement Tracking System
-- Description: Add support for tracking multiple privileges/endorsements per document
-- with individual expiry dates (e.g., license endorsements, BFR ratings)

-- ============================================================================
-- 1. CREATE DOCUMENT CATEGORIES TABLE
-- ============================================================================
-- Stores top-level document categories (License, Medical, BFR, etc.)

CREATE TABLE IF NOT EXISTS document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  requires_endorsements BOOLEAN DEFAULT FALSE,  -- Enable privilege tracking for this category
  icon TEXT,                                     -- Lucide icon name for UI
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_document_categories_active ON document_categories(active);
CREATE INDEX idx_document_categories_sort ON document_categories(sort_order);

-- RLS Policies
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active categories"
  ON document_categories FOR SELECT
  USING (active = true);

CREATE POLICY "Board members can manage categories"
  ON document_categories FOR ALL
  USING (is_board_member(auth.uid()));

-- ============================================================================
-- 2. CREATE DOCUMENT SUBCATEGORIES TABLE
-- ============================================================================
-- Stores subcategories under each category (PPL, CPL, Class 1, Class 2, etc.)

CREATE TABLE IF NOT EXISTS document_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES document_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,                                     -- Short code (e.g., 'PPL', 'CPL')
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(category_id, name)
);

-- Partial unique index for non-null codes
CREATE UNIQUE INDEX idx_document_subcategories_code_unique
  ON document_subcategories(category_id, code)
  WHERE code IS NOT NULL;

-- Indexes for performance
CREATE INDEX idx_document_subcategories_category ON document_subcategories(category_id);
CREATE INDEX idx_document_subcategories_active ON document_subcategories(active, category_id);

-- RLS Policies
ALTER TABLE document_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active subcategories"
  ON document_subcategories FOR SELECT
  USING (active = true);

CREATE POLICY "Board members can manage subcategories"
  ON document_subcategories FOR ALL
  USING (is_board_member(auth.uid()));

-- ============================================================================
-- 3. CREATE DOCUMENT ENDORSEMENTS TABLE
-- ============================================================================
-- Stores available endorsements/ratings for categories (SEP, MEP, HP, etc.)

CREATE TABLE IF NOT EXISTS document_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES document_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,                                     -- Short code (e.g., 'SEP', 'MEP', 'HP')
  description TEXT,
  is_predefined BOOLEAN DEFAULT TRUE,            -- Board-created vs user-created
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partial unique index for non-null codes
CREATE UNIQUE INDEX idx_document_endorsements_code_unique
  ON document_endorsements(category_id, code)
  WHERE code IS NOT NULL;

-- Indexes for performance
CREATE INDEX idx_document_endorsements_category ON document_endorsements(category_id);
CREATE INDEX idx_document_endorsements_active ON document_endorsements(active, category_id);
CREATE INDEX idx_document_endorsements_predefined ON document_endorsements(is_predefined);

-- RLS Policies
ALTER TABLE document_endorsements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active endorsements"
  ON document_endorsements FOR SELECT
  USING (active = true);

CREATE POLICY "Board members can manage predefined endorsements"
  ON document_endorsements FOR ALL
  USING (is_board_member(auth.uid()));

CREATE POLICY "Users can create custom endorsements"
  ON document_endorsements FOR INSERT
  WITH CHECK (is_predefined = false AND active = true);

-- ============================================================================
-- 4. CREATE DOCUMENT PRIVILEGES TABLE
-- ============================================================================
-- Stores actual privileges/endorsements assigned to specific documents

CREATE TABLE IF NOT EXISTS document_privileges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  endorsement_id UUID REFERENCES document_endorsements(id) ON DELETE SET NULL,
  custom_name TEXT,                              -- User-provided name if no endorsement_id
  expiry_date DATE,                              -- Individual expiry per privilege (can be NULL)
  notes TEXT,
  added_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Either endorsement_id OR custom_name must be set (not both, not neither)
  CONSTRAINT privilege_name_check CHECK (
    (endorsement_id IS NOT NULL AND custom_name IS NULL) OR
    (endorsement_id IS NULL AND custom_name IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_document_privileges_document ON document_privileges(document_id);
CREATE INDEX idx_document_privileges_endorsement ON document_privileges(endorsement_id);
CREATE INDEX idx_document_privileges_expiry ON document_privileges(expiry_date) WHERE expiry_date IS NOT NULL;

-- RLS Policies
ALTER TABLE document_privileges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view privileges on documents they can see"
  ON document_privileges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_privileges.document_id
      AND (
        d.approved = true OR
        d.user_id = auth.uid() OR
        d.uploaded_by = auth.uid() OR
        is_board_member(auth.uid())
      )
    )
  );

CREATE POLICY "Users can add privileges to their own documents"
  ON document_privileges FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_privileges.document_id
      AND (d.user_id = auth.uid() OR d.uploaded_by = auth.uid())
    )
    AND added_by = auth.uid()
  );

CREATE POLICY "Users can edit privileges on their own documents"
  ON document_privileges FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_privileges.document_id
      AND (d.user_id = auth.uid() OR d.uploaded_by = auth.uid())
    )
  );

CREATE POLICY "Users can delete privileges on their own documents"
  ON document_privileges FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_privileges.document_id
      AND (d.user_id = auth.uid() OR d.uploaded_by = auth.uid())
    )
  );

CREATE POLICY "Board members can manage all privileges"
  ON document_privileges FOR ALL
  USING (is_board_member(auth.uid()));

-- ============================================================================
-- 5. ALTER DOCUMENT_TYPES TABLE
-- ============================================================================
-- Add category and subcategory references to link document types to new system

ALTER TABLE document_types
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES document_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES document_subcategories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_document_types_category ON document_types(category_id);
CREATE INDEX IF NOT EXISTS idx_document_types_subcategory ON document_types(subcategory_id);

-- ============================================================================
-- 6. CREATE ENHANCED VIEW FOR DOCUMENTS WITH PRIVILEGES
-- ============================================================================
-- Provides aggregated privilege information for documents

CREATE OR REPLACE VIEW user_documents_with_privileges AS
SELECT
  d.*,
  dt.name AS document_type_name,
  dt.category_id,
  dt.subcategory_id,
  dc.name AS category_name,
  dc.requires_endorsements,
  dsc.name AS subcategory_name,
  dsc.code AS subcategory_code,
  -- Privilege aggregations
  COUNT(dp.id) AS privilege_count,
  COUNT(dp.id) FILTER (WHERE dp.expiry_date IS NOT NULL AND dp.expiry_date < CURRENT_DATE) AS expired_privileges,
  COUNT(dp.id) FILTER (WHERE dp.expiry_date IS NOT NULL AND dp.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') AS expiring_privileges,
  MIN(dp.expiry_date) FILTER (WHERE dp.expiry_date IS NOT NULL) AS earliest_privilege_expiry,
  -- Overall document status considering privileges
  CASE
    WHEN COUNT(dp.id) FILTER (WHERE dp.expiry_date IS NOT NULL AND dp.expiry_date < CURRENT_DATE) > 0 THEN 'has_expired_privileges'
    WHEN COUNT(dp.id) FILTER (WHERE dp.expiry_date IS NOT NULL AND dp.expiry_date < CURRENT_DATE + INTERVAL '30 days') > 0 THEN 'has_expiring_privileges'
    WHEN d.expiry_date IS NOT NULL AND d.expiry_date < CURRENT_DATE THEN 'expired'
    WHEN d.expiry_date IS NOT NULL AND d.expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'valid'
  END AS overall_status
FROM documents d
LEFT JOIN document_types dt ON d.document_type_id = dt.id
LEFT JOIN document_categories dc ON dt.category_id = dc.id
LEFT JOIN document_subcategories dsc ON dt.subcategory_id = dsc.id
LEFT JOIN document_privileges dp ON d.id = dp.document_id
WHERE d.user_id IS NOT NULL
GROUP BY d.id, dt.id, dc.id, dsc.id;

-- ============================================================================
-- 7. CREATE HELPER FUNCTION FOR PRIVILEGE ALERTS
-- ============================================================================
-- Returns count and details of privilege alerts for a user

CREATE OR REPLACE FUNCTION get_user_privilege_alerts(p_user_id UUID)
RETURNS TABLE (
  total_alerts INTEGER,
  expired_count INTEGER,
  expiring_count INTEGER,
  privilege_alerts JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (COUNT(*) FILTER (WHERE dp.expiry_date < CURRENT_DATE) +
     COUNT(*) FILTER (WHERE dp.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'))::INTEGER AS total_alerts,
    COUNT(*) FILTER (WHERE dp.expiry_date < CURRENT_DATE)::INTEGER AS expired_count,
    COUNT(*) FILTER (WHERE dp.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days')::INTEGER AS expiring_count,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'documentId', d.id,
          'documentName', dt.name,
          'privilegeId', dp.id,
          'privilegeName', COALESCE(de.name, dp.custom_name),
          'expiryDate', dp.expiry_date,
          'status', CASE
            WHEN dp.expiry_date < CURRENT_DATE THEN 'expired'
            ELSE 'expiring_soon'
          END,
          'daysUntilExpiry', dp.expiry_date - CURRENT_DATE
        ) ORDER BY dp.expiry_date
      ) FILTER (WHERE dp.expiry_date IS NOT NULL AND dp.expiry_date < CURRENT_DATE + INTERVAL '30 days'),
      '[]'::jsonb
    ) AS privilege_alerts
  FROM documents d
  INNER JOIN document_types dt ON d.document_type_id = dt.id
  INNER JOIN document_privileges dp ON d.id = dp.document_id
  LEFT JOIN document_endorsements de ON dp.endorsement_id = de.id
  WHERE d.user_id = p_user_id
    AND d.approved = true
    AND dp.expiry_date IS NOT NULL
    AND dp.expiry_date < CURRENT_DATE + INTERVAL '30 days';
END;
$$;

-- ============================================================================
-- 8. ADD UPDATED_AT TRIGGER FOR NEW TABLES
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_document_categories_updated_at
  BEFORE UPDATE ON document_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_subcategories_updated_at
  BEFORE UPDATE ON document_subcategories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_endorsements_updated_at
  BEFORE UPDATE ON document_endorsements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_privileges_updated_at
  BEFORE UPDATE ON document_privileges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE document_categories IS 'Top-level document categories (License, Medical, BFR, etc.)';
COMMENT ON TABLE document_subcategories IS 'Subcategories within categories (PPL, CPL, Class 1, Class 2, etc.)';
COMMENT ON TABLE document_endorsements IS 'Available endorsements/ratings that can be tracked (SEP, MEP, HP, etc.)';
COMMENT ON TABLE document_privileges IS 'Actual privileges/endorsements assigned to specific documents with individual expiry dates';
COMMENT ON COLUMN document_categories.requires_endorsements IS 'If true, documents in this category can have multiple privileges tracked';
COMMENT ON COLUMN document_endorsements.is_predefined IS 'True for board-created endorsements, false for user-created custom ones';
COMMENT ON COLUMN document_privileges.custom_name IS 'Used when user creates a custom endorsement not in predefined list';
COMMENT ON COLUMN document_privileges.expiry_date IS 'Individual expiry date for this privilege (can differ from main document expiry)';
COMMENT ON VIEW user_documents_with_privileges IS 'Enhanced view showing documents with aggregated privilege information';
COMMENT ON FUNCTION get_user_privilege_alerts IS 'Returns privilege alert counts and details for a specific user';
