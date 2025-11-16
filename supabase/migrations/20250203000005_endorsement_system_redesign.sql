-- ============================================================================
-- ENDORSEMENT SYSTEM REDESIGN WITH IR TRACKING
-- ============================================================================
-- This migration redesigns the endorsement/rating system to be centrally managed
-- with support for Instrument Rating (IR) privileges with separate expiry dates.
--
-- Key Features:
-- 1. Centrally managed endorsements (not tied to categories)
-- 2. IR tracking with separate expiry dates per rating
-- 3. Link endorsements to multiple document types
-- 4. Visual expiry warnings and status indicators
-- 5. Configuration field to specify which endorsements support IR
-- ============================================================================

-- ============================================================================
-- 1. DROP OLD TABLES AND RECREATE
-- ============================================================================

-- Drop existing privilege and endorsement tables
DROP TABLE IF EXISTS document_privileges CASCADE;
DROP TABLE IF EXISTS document_endorsements CASCADE;

-- ============================================================================
-- 2. CREATE ENDORSEMENTS TABLE (Centrally Managed)
-- ============================================================================

CREATE TABLE IF NOT EXISTS endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  name_de VARCHAR(255), -- German translation
  description TEXT,
  is_predefined BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  supports_ir BOOLEAN NOT NULL DEFAULT false, -- Whether this endorsement can have IR privileges
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE endorsements IS 'Centrally managed endorsements/ratings that can be linked to multiple document types (e.g., SEP, MEP, IR, TMG)';
COMMENT ON COLUMN endorsements.code IS 'Unique code for the endorsement (e.g., SEP, MEP, IR)';
COMMENT ON COLUMN endorsements.is_predefined IS 'System-defined endorsements cannot be deleted';
COMMENT ON COLUMN endorsements.active IS 'Inactive endorsements are hidden from selection but preserved for historical data';
COMMENT ON COLUMN endorsements.supports_ir IS 'Whether this endorsement/rating can have Instrument Rating (IR) privileges';

CREATE INDEX IF NOT EXISTS idx_endorsements_code ON endorsements(code);
CREATE INDEX IF NOT EXISTS idx_endorsements_active ON endorsements(active) WHERE active = true;

-- ============================================================================
-- 3. CREATE DOCUMENT_TYPE_ENDORSEMENTS (Junction Table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_type_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type_id UUID NOT NULL REFERENCES document_types(id) ON DELETE CASCADE,
  endorsement_id UUID NOT NULL REFERENCES endorsements(id) ON DELETE CASCADE,
  is_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(document_type_id, endorsement_id)
);

COMMENT ON TABLE document_type_endorsements IS 'Links endorsements to document types - allows same endorsement on multiple document types (e.g., SEP on both License and BFR)';
COMMENT ON COLUMN document_type_endorsements.is_required IS 'Whether this endorsement is required for this document type';

CREATE INDEX IF NOT EXISTS idx_doc_type_endorsements_doc_type ON document_type_endorsements(document_type_id);
CREATE INDEX IF NOT EXISTS idx_doc_type_endorsements_endorsement ON document_type_endorsements(endorsement_id);

-- ============================================================================
-- 4. CREATE DOCUMENT_ENDORSEMENT_PRIVILEGES (With IR Tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_endorsement_privileges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  endorsement_id UUID NOT NULL REFERENCES endorsements(id) ON DELETE CASCADE,

  -- Main endorsement/rating details
  expiry_date DATE, -- Main expiry date for the rating
  notes TEXT,

  -- IR (Instrument Rating) tracking
  has_ir BOOLEAN NOT NULL DEFAULT false, -- Does this rating have IR privileges?
  ir_expiry_date DATE, -- Separate expiry for IR (can be different from main expiry)

  -- Audit fields
  added_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(document_id, endorsement_id) -- One endorsement per document
);

COMMENT ON TABLE document_endorsement_privileges IS 'Tracks endorsements/ratings on documents with optional IR privileges and separate expiry dates';
COMMENT ON COLUMN document_endorsement_privileges.expiry_date IS 'Primary expiry date for the rating (e.g., SEP valid until...)';
COMMENT ON COLUMN document_endorsement_privileges.has_ir IS 'Whether this rating includes Instrument Rating privileges';
COMMENT ON COLUMN document_endorsement_privileges.ir_expiry_date IS 'Separate expiry date for IR privileges (default to same as expiry_date, can differ)';

CREATE INDEX IF NOT EXISTS idx_doc_endorsement_priv_document ON document_endorsement_privileges(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_endorsement_priv_endorsement ON document_endorsement_privileges(endorsement_id);
CREATE INDEX IF NOT EXISTS idx_doc_endorsement_priv_expiry ON document_endorsement_privileges(expiry_date);
CREATE INDEX IF NOT EXISTS idx_doc_endorsement_priv_ir_expiry ON document_endorsement_privileges(ir_expiry_date) WHERE has_ir = true;

-- ============================================================================
-- 5. INSERT PREDEFINED ENDORSEMENTS WITH IR SUPPORT
-- ============================================================================

-- Aviation Ratings/Endorsements
INSERT INTO endorsements (code, name, name_de, description, is_predefined, supports_ir) VALUES
  -- Class ratings that can have IR
  ('SEP', 'Single Engine Piston', 'Einmotorige Kolbenflugzeuge', 'Single engine piston aircraft class rating', true, true),
  ('MEP', 'Multi Engine Piston', 'Mehrmotorige Kolbenflugzeuge', 'Multi engine piston aircraft class rating', true, true),
  ('SET', 'Single Engine Turbine', 'Einmotorige Turboprop', 'Single engine turboprop aircraft class rating', true, true),
  ('TMG', 'Touring Motor Glider', 'Reisemotorsegler', 'Touring motor glider class rating', true, true),

  -- Standalone IR (doesn't have "IR for IR")
  ('IR', 'Instrument Rating', 'Instrumentenflugberechtigung', 'Instrument rating (standalone)', true, false),

  -- Instructor ratings (no IR)
  ('FI', 'Flight Instructor', 'Fluglehrer', 'Flight instructor rating', true, false),
  ('CRI', 'Class Rating Instructor', 'Klassenlehrer', 'Class rating instructor', true, false),
  ('IRI', 'Instrument Rating Instructor', 'Instrumentenfluglehrer', 'Instrument rating instructor', true, false),

  -- Examiner ratings (no IR)
  ('FE', 'Flight Examiner', 'Prüfer', 'Flight examiner', true, false),
  ('CRE', 'Class Rating Examiner', 'Klassenprüfer', 'Class rating examiner', true, false),
  ('IRE', 'Instrument Rating Examiner', 'Instrumentenflugprüfer', 'Instrument rating examiner', true, false),

  -- Other privileges (no IR)
  ('NIGHT', 'Night Rating', 'Nachtflugberechtigung', 'Night flying privileges', true, false),
  ('AEROBATIC', 'Aerobatic', 'Kunstflug', 'Aerobatic privileges', true, false)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE endorsements ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_type_endorsements ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_endorsement_privileges ENABLE ROW LEVEL SECURITY;

-- Endorsements: All authenticated users can view, board can manage
CREATE POLICY "Anyone can view active endorsements"
  ON endorsements FOR SELECT
  USING (auth.uid() IS NOT NULL AND active = true);

CREATE POLICY "Board members can manage endorsements"
  ON endorsements FOR ALL
  USING (is_board_member(auth.uid()));

-- Document Type Endorsements: All can view, board can manage
CREATE POLICY "Anyone can view document type endorsements"
  ON document_type_endorsements FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Board members can manage document type endorsements"
  ON document_type_endorsements FOR ALL
  USING (is_board_member(auth.uid()));

-- Document Endorsement Privileges: Users can view own, board can view all
CREATE POLICY "Users can view endorsements on their own documents"
  ON document_endorsement_privileges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_endorsement_privileges.document_id
      AND (d.user_id = auth.uid() OR d.uploaded_by = auth.uid())
    )
  );

CREATE POLICY "Users can create endorsements on their own documents"
  ON document_endorsement_privileges FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_endorsement_privileges.document_id
      AND (d.user_id = auth.uid() OR d.uploaded_by = auth.uid())
    )
  );

CREATE POLICY "Users can update endorsements on their own documents"
  ON document_endorsement_privileges FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_endorsement_privileges.document_id
      AND (d.user_id = auth.uid() OR d.uploaded_by = auth.uid())
    )
  );

CREATE POLICY "Users can delete endorsements on their own documents"
  ON document_endorsement_privileges FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_endorsement_privileges.document_id
      AND (d.user_id = auth.uid() OR d.uploaded_by = auth.uid())
    )
  );

CREATE POLICY "Board members can manage all endorsement privileges"
  ON document_endorsement_privileges FOR ALL
  USING (is_board_member(auth.uid()));

-- ============================================================================
-- 7. HELPER FUNCTION FOR ENDORSEMENT ALERTS WITH IR TRACKING
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_endorsement_alerts(p_user_id UUID)
RETURNS TABLE (
  total_alerts INTEGER,
  expired_count INTEGER,
  expiring_count INTEGER,
  ir_expired_count INTEGER,
  ir_expiring_count INTEGER,
  endorsement_alerts JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total alerts (main expiry + IR expiry)
    (COUNT(*) FILTER (WHERE dep.expiry_date < CURRENT_DATE) +
     COUNT(*) FILTER (WHERE dep.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') +
     COUNT(*) FILTER (WHERE dep.has_ir AND dep.ir_expiry_date < CURRENT_DATE) +
     COUNT(*) FILTER (WHERE dep.has_ir AND dep.ir_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'))::INTEGER AS total_alerts,

    -- Main expiry counts
    COUNT(*) FILTER (WHERE dep.expiry_date < CURRENT_DATE)::INTEGER AS expired_count,
    COUNT(*) FILTER (WHERE dep.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days')::INTEGER AS expiring_count,

    -- IR expiry counts
    COUNT(*) FILTER (WHERE dep.has_ir AND dep.ir_expiry_date < CURRENT_DATE)::INTEGER AS ir_expired_count,
    COUNT(*) FILTER (WHERE dep.has_ir AND dep.ir_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days')::INTEGER AS ir_expiring_count,

    -- Detailed alerts
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'documentId', d.id,
          'documentName', dt.name,
          'endorsementId', dep.id,
          'endorsementName', e.name,
          'endorsementCode', e.code,
          'expiryDate', dep.expiry_date,
          'status', CASE
            WHEN dep.expiry_date < CURRENT_DATE THEN 'expired'
            ELSE 'expiring_soon'
          END,
          'daysUntilExpiry', dep.expiry_date - CURRENT_DATE,
          'hasIR', dep.has_ir,
          'irExpiryDate', dep.ir_expiry_date,
          'irStatus', CASE
            WHEN dep.has_ir AND dep.ir_expiry_date < CURRENT_DATE THEN 'expired'
            WHEN dep.has_ir AND dep.ir_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
            ELSE 'valid'
          END,
          'irDaysUntilExpiry', CASE WHEN dep.has_ir THEN dep.ir_expiry_date - CURRENT_DATE ELSE NULL END
        ) ORDER BY dep.expiry_date
      ) FILTER (
        WHERE dep.expiry_date IS NOT NULL
        AND (
          dep.expiry_date < CURRENT_DATE + INTERVAL '30 days'
          OR (dep.has_ir AND dep.ir_expiry_date < CURRENT_DATE + INTERVAL '30 days')
        )
      ),
      '[]'::jsonb
    ) AS endorsement_alerts
  FROM documents d
  INNER JOIN document_types dt ON d.document_type_id = dt.id
  INNER JOIN document_endorsement_privileges dep ON d.id = dep.document_id
  INNER JOIN endorsements e ON dep.endorsement_id = e.id
  WHERE d.user_id = p_user_id
    AND d.approved = true;
END;
$$;

COMMENT ON FUNCTION get_user_endorsement_alerts IS 'Returns endorsement expiry alerts including separate IR expiry tracking';

-- ============================================================================
-- 8. UPDATED_AT TRIGGERS
-- ============================================================================

CREATE TRIGGER update_endorsements_updated_at
  BEFORE UPDATE ON endorsements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_endorsement_privileges_updated_at
  BEFORE UPDATE ON document_endorsement_privileges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. REMOVE OLD CATEGORY-BASED ENDORSEMENT COLUMNS
-- ============================================================================

-- Remove category_id from document_endorsements (old table, now dropped)
-- Remove requires_endorsements from document_categories as endorsements are now centrally managed
ALTER TABLE document_categories DROP COLUMN IF EXISTS requires_endorsements;

COMMENT ON TABLE document_categories IS 'Document categories for organization (License, Medical, etc.) - endorsements are now centrally managed';
