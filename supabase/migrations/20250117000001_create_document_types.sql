-- Create document_types table for defining required document types per function
-- This allows board members to configure which documents are required for each user function

CREATE TABLE IF NOT EXISTS public.document_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    mandatory BOOLEAN DEFAULT false,
    expires BOOLEAN DEFAULT false,
    expiry_type VARCHAR(50), -- 'DATE', 'DURATION', null if expires=false
    default_validity_months INTEGER, -- for DURATION type
    required_for_functions UUID[], -- Array of function IDs that require this document
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_document_types_required_for_functions
    ON public.document_types USING GIN (required_for_functions);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_document_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_document_types_updated_at
    BEFORE UPDATE ON public.document_types
    FOR EACH ROW
    EXECUTE FUNCTION public.update_document_types_updated_at();

-- Add RLS (Row Level Security) policies
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

-- Board members can manage document types
CREATE POLICY "Board members can manage document types"
    ON public.document_types
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND 'board' = ANY(users.role)
        )
    );

-- All authenticated users can view document types
CREATE POLICY "All users can view document types"
    ON public.document_types
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Modify documents table to link to document_types
ALTER TABLE public.documents
    ADD COLUMN IF NOT EXISTS document_type_id UUID REFERENCES public.document_types(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Add index for document_type_id
CREATE INDEX IF NOT EXISTS idx_documents_document_type_id
    ON public.documents(document_type_id);

-- Add index for user_id to improve document queries
CREATE INDEX IF NOT EXISTS idx_documents_user_id
    ON public.documents(user_id);

-- Create a view for user documents with type information
CREATE OR REPLACE VIEW public.user_documents_with_types AS
SELECT
    d.*,
    dt.name as document_type_name,
    dt.mandatory as document_type_mandatory,
    dt.expires as document_type_expires,
    dt.expiry_type as document_type_expiry_type,
    dt.required_for_functions as document_type_required_for_functions,
    u.name as uploader_name,
    u.surname as uploader_surname,
    approver.name as approver_name,
    approver.surname as approver_surname
FROM public.documents d
LEFT JOIN public.document_types dt ON d.document_type_id = dt.id
LEFT JOIN public.users u ON d.uploaded_by = u.id
LEFT JOIN public.users approver ON d.approved_by = approver.id;

-- Insert default document types for common pilot documents
INSERT INTO public.document_types (name, description, category, mandatory, expires, expiry_type, default_validity_months, required_for_functions)
VALUES
    ('Pilot License', 'Valid pilot license (PPL, CPL, ATPL)', 'License', true, true, 'DATE', NULL, '{}'),
    ('Medical Certificate', 'Valid medical certificate (Class 1 or Class 2)', 'Medical', true, true, 'DATE', 12, '{}'),
    ('Radio Telephone License', 'Valid radio telephone operator license', 'License', true, false, NULL, NULL, '{}'),
    ('Passport Copy', 'Copy of passport for identification', 'Identification', false, true, 'DATE', NULL, '{}'),
    ('Insurance Certificate', 'Proof of personal liability insurance', 'Insurance', false, true, 'DATE', 12, '{}');

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_types TO authenticated;
GRANT SELECT ON public.user_documents_with_types TO authenticated;
