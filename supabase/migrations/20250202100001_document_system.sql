-- =====================================================
-- DOCUMENT MANAGEMENT SYSTEM
-- =====================================================
-- This migration creates the document types and validation system
--
-- Consolidated from:
-- - 20250117000001_create_document_types.sql
-- - 20250202100015_simplify_document_expiry.sql
--
-- Documents use fixed expiry dates only (no duration-based expiry)
-- =====================================================

-- Document types table
CREATE TABLE IF NOT EXISTS public.document_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT,
    mandatory BOOLEAN NOT NULL DEFAULT FALSE,
    expires BOOLEAN NOT NULL DEFAULT FALSE,
    required_for_functions TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT document_types_name_check CHECK (LENGTH(name) > 0)
);

-- Index for document types
CREATE INDEX idx_document_types_category ON public.document_types(category);
CREATE INDEX idx_document_types_mandatory ON public.document_types(mandatory);
CREATE INDEX idx_document_types_required_for_functions ON public.document_types USING GIN(required_for_functions);

-- Add document_type_id foreign key to documents table
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS document_type_id UUID REFERENCES public.document_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_document_type_id ON public.documents(document_type_id);

-- =====================================================
-- HELPER VIEW: USER DOCUMENTS WITH TYPES
-- =====================================================

CREATE OR REPLACE VIEW public.user_documents_with_types AS
SELECT
    d.*,
    dt.name AS document_type_name,
    dt.description AS document_type_description,
    dt.mandatory AS document_type_mandatory,
    dt.expires AS document_type_expires,
    dt.required_for_functions,
    CASE
        WHEN d.expiry_date IS NOT NULL AND d.expiry_date < CURRENT_DATE THEN 'expired'
        WHEN d.expiry_date IS NOT NULL AND d.expiry_date < (CURRENT_DATE + INTERVAL '30 days') THEN 'expiring_soon'
        ELSE 'valid'
    END AS expiry_status
FROM public.documents d
LEFT JOIN public.document_types dt ON d.document_type_id = dt.id
WHERE d.user_id IS NOT NULL;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_document_types_updated_at
    BEFORE UPDATE ON public.document_types
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

-- Document Types: Read - all authenticated users can read
CREATE POLICY "Document types viewable by authenticated users"
    ON public.document_types FOR SELECT
    TO authenticated
    USING (true);

-- Document Types: Insert/Update/Delete - only board members
CREATE POLICY "Board can manage document types"
    ON public.document_types FOR ALL
    TO authenticated
    USING (public.is_board_member(auth.uid()))
    WITH CHECK (public.is_board_member(auth.uid()));

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.document_types IS 'Defines types of documents and their validation rules';
COMMENT ON COLUMN public.document_types.mandatory IS 'Whether this document type is required';
COMMENT ON COLUMN public.document_types.expires IS 'Whether this document has an expiry date (fixed date only)';
COMMENT ON COLUMN public.document_types.required_for_functions IS 'Array of function codes that require this document (e.g., pilot, flight_instructor)';
COMMENT ON VIEW public.user_documents_with_types IS 'User documents joined with their types and expiry status';
