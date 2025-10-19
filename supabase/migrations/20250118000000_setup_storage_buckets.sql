-- Setup Storage Buckets and RLS Policies
-- This migration creates the necessary storage buckets and sets up Row Level Security policies

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('documents', 'documents', false),
  ('club-documents', 'club-documents', true),
  ('aircraft-documents', 'aircraft-documents', true),
  ('user-documents', 'user-documents', false),
  ('flight-logs', 'flight-logs', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DOCUMENTS BUCKET (for user documents - licenses, medical, ID, etc.)
-- ============================================================================

-- Policy: Users can upload their own documents
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own documents
CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Board members can upload documents for any user
CREATE POLICY "Board members can upload documents for any user"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND 'board' = ANY(role)
  )
);

-- Policy: Board members can view all documents
CREATE POLICY "Board members can view all documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND 'board' = ANY(role)
  )
);

-- Policy: Users can update their own documents
CREATE POLICY "Users can update their own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Board members can update any document
CREATE POLICY "Board members can update any document"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND 'board' = ANY(role)
  )
)
WITH CHECK (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND 'board' = ANY(role)
  )
);

-- Policy: Users can delete their own documents
CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Board members can delete any document
CREATE POLICY "Board members can delete any document"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND 'board' = ANY(role)
  )
);

-- ============================================================================
-- CLUB-DOCUMENTS BUCKET (public - for club documents)
-- ============================================================================

-- Policy: Anyone authenticated can view club documents
CREATE POLICY "Anyone authenticated can view club documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'club-documents');

-- Policy: Board members can upload club documents
CREATE POLICY "Board members can upload club documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'club-documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND 'board' = ANY(role)
  )
);

-- Policy: Board members can update club documents
CREATE POLICY "Board members can update club documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'club-documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND 'board' = ANY(role)
  )
)
WITH CHECK (
  bucket_id = 'club-documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND 'board' = ANY(role)
  )
);

-- Policy: Board members can delete club documents
CREATE POLICY "Board members can delete club documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'club-documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND 'board' = ANY(role)
  )
);

-- ============================================================================
-- AIRCRAFT-DOCUMENTS BUCKET (public - for aircraft documents)
-- ============================================================================

-- Policy: Anyone authenticated can view aircraft documents
CREATE POLICY "Anyone authenticated can view aircraft documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'aircraft-documents');

-- Policy: Board members can upload aircraft documents
CREATE POLICY "Board members can upload aircraft documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'aircraft-documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND 'board' = ANY(role)
  )
);

-- Policy: Board members can update aircraft documents
CREATE POLICY "Board members can update aircraft documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'aircraft-documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND 'board' = ANY(role)
  )
)
WITH CHECK (
  bucket_id = 'aircraft-documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND 'board' = ANY(role)
  )
);

-- Policy: Board members can delete aircraft documents
CREATE POLICY "Board members can delete aircraft documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'aircraft-documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND 'board' = ANY(role)
  )
);
