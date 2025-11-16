-- Migration: Seed Initial Document Categories, Subcategories, and Endorsements
-- Description: Pre-populate the system with standard aviation document categories

-- ============================================================================
-- 1. INSERT INITIAL CATEGORIES
-- ============================================================================

INSERT INTO document_categories (name, description, requires_endorsements, icon, sort_order, active) VALUES
  ('License', 'Pilot licenses and ratings', TRUE, 'Award', 1, TRUE),
  ('Medical', 'Medical certificates', FALSE, 'Heart', 2, TRUE),
  ('BFR', 'Biennial Flight Review / Proficiency Check', FALSE, 'CheckCircle', 3, TRUE),
  ('Passport', 'Passport documents', FALSE, 'Plane', 4, TRUE),
  ('ID', 'Identification documents', FALSE, 'CreditCard', 5, TRUE)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. INSERT SUBCATEGORIES FOR LICENSE
-- ============================================================================

WITH license_cat AS (
  SELECT id FROM document_categories WHERE name = 'License'
)
INSERT INTO document_subcategories (category_id, name, code, description, sort_order, active)
SELECT
  license_cat.id,
  subcategory.name,
  subcategory.code,
  subcategory.description,
  subcategory.sort_order,
  TRUE
FROM license_cat
CROSS JOIN (VALUES
  ('PPL', 'PPL', 'Private Pilot License', 1),
  ('CPL', 'CPL', 'Commercial Pilot License', 2),
  ('ATPL', 'ATPL', 'Airline Transport Pilot License', 3),
  ('LAPL', 'LAPL', 'Light Aircraft Pilot License', 4)
) AS subcategory(name, code, description, sort_order)
ON CONFLICT (category_id, name) DO NOTHING;

-- ============================================================================
-- 3. INSERT SUBCATEGORIES FOR MEDICAL
-- ============================================================================

WITH medical_cat AS (
  SELECT id FROM document_categories WHERE name = 'Medical'
)
INSERT INTO document_subcategories (category_id, name, code, description, sort_order, active)
SELECT
  medical_cat.id,
  subcategory.name,
  subcategory.code,
  subcategory.description,
  subcategory.sort_order,
  TRUE
FROM medical_cat
CROSS JOIN (VALUES
  ('Class 1', 'CL1', 'Class 1 Medical Certificate (ATPL)', 1),
  ('Class 2', 'CL2', 'Class 2 Medical Certificate (CPL/PPL)', 2),
  ('LAPL Medical', 'LAPL', 'LAPL Medical Certificate', 3)
) AS subcategory(name, code, description, sort_order)
ON CONFLICT (category_id, name) DO NOTHING;

-- ============================================================================
-- 4. INSERT COMMON ENDORSEMENTS FOR LICENSE CATEGORY
-- ============================================================================

WITH license_cat AS (
  SELECT id FROM document_categories WHERE name = 'License'
)
INSERT INTO document_endorsements (category_id, name, code, description, is_predefined, sort_order, active)
SELECT
  license_cat.id,
  endorsement.name,
  endorsement.code,
  endorsement.description,
  TRUE,
  endorsement.sort_order,
  TRUE
FROM license_cat
CROSS JOIN (VALUES
  -- Aircraft Class Ratings
  ('SEP', 'SEP', 'Single Engine Piston (Land)', 1),
  ('MEP', 'MEP', 'Multi Engine Piston (Land)', 2),
  ('SET', 'SET', 'Single Engine Turbine', 3),
  ('MET', 'MET', 'Multi Engine Turbine', 4),

  -- Special Endorsements
  ('Tailwheel', 'TW', 'Tailwheel Aircraft', 10),
  ('High Performance', 'HP', 'High Performance Aircraft (>200 HP)', 11),
  ('Complex', 'COMPLEX', 'Complex Aircraft (retractable gear, flaps, controllable prop)', 12),
  ('Aerobatic', 'ACRO', 'Aerobatic Flight', 13),

  -- Instrument Rating
  ('Instrument Rating', 'IR', 'Instrument Rating', 20),
  ('IR(A)', 'IR(A)', 'Instrument Rating Airplane', 21),

  -- Flight Instructor Ratings
  ('FI(A)', 'FI', 'Flight Instructor Rating Airplane', 30),
  ('CRI', 'CRI', 'Class Rating Instructor', 31),
  ('IRI', 'IRI', 'Instrument Rating Instructor', 32),

  -- Night Rating
  ('Night Rating', 'NIGHT', 'Night Rating', 40),

  -- Multi-crew Cooperation
  ('MCC', 'MCC', 'Multi-Crew Cooperation', 50)
) AS endorsement(name, code, description, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM document_endorsements de
  WHERE de.category_id = license_cat.id
    AND de.code = endorsement.code
);

-- ============================================================================
-- 5. VERIFY SEED DATA
-- ============================================================================

DO $$
DECLARE
  cat_count INTEGER;
  subcat_count INTEGER;
  endorse_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cat_count FROM document_categories;
  SELECT COUNT(*) INTO subcat_count FROM document_subcategories;
  SELECT COUNT(*) INTO endorse_count FROM document_endorsements;

  RAISE NOTICE 'Seed data inserted successfully:';
  RAISE NOTICE '  - % categories', cat_count;
  RAISE NOTICE '  - % subcategories', subcat_count;
  RAISE NOTICE '  - % endorsements', endorse_count;
END $$;
