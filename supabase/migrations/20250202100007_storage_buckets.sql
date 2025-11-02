-- =====================================================
-- STORAGE BUCKETS & POLICIES
-- =====================================================
-- This migration creates all storage buckets for file uploads
--
-- Consolidated from:
-- - 20250118000000_setup_storage_buckets.sql
-- - 20250201000003_add_tandem_settings.sql (tandem-documents bucket)
--
-- =====================================================
-- 1. CREATE STORAGE BUCKETS
-- =====================================================

-- General documents bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Club-wide documents bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('club-documents', 'club-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Aircraft-specific documents bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('aircraft-documents', 'aircraft-documents', false)
ON CONFLICT (id) DO NOTHING;

-- User-specific documents bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-documents', 'user-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Flight logs bucket (PDF M&B sheets, private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('flight-logs', 'flight-logs', false)
ON CONFLICT (id) DO NOTHING;

-- Tandem documents bucket (public - for terms & conditions)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tandem-documents', 'tandem-documents', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. STORAGE POLICIES: DOCUMENTS (GENERAL)
-- =====================================================

-- Board members can upload to documents bucket
CREATE POLICY "Board members can upload to documents bucket"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'documents' AND
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND 'board' = ANY(users.role)
        )
    );

-- Board members can view all documents
CREATE POLICY "Board members can view all documents"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'documents' AND
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND 'board' = ANY(users.role)
        )
    );

-- Board members can delete documents
CREATE POLICY "Board members can delete documents"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'documents' AND
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND 'board' = ANY(users.role)
        )
    );

-- =====================================================
-- 3. STORAGE POLICIES: CLUB DOCUMENTS (PUBLIC)
-- =====================================================

-- Everyone can view club documents
CREATE POLICY "Everyone can view club documents"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'club-documents');

-- Board members can upload club documents
CREATE POLICY "Board members can upload club documents"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'club-documents' AND
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND 'board' = ANY(users.role)
        )
    );

-- Board members can delete club documents
CREATE POLICY "Board members can delete club documents"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'club-documents' AND
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND 'board' = ANY(users.role)
        )
    );

-- =====================================================
-- 4. STORAGE POLICIES: AIRCRAFT DOCUMENTS
-- =====================================================

-- Authenticated users can view aircraft documents
CREATE POLICY "Authenticated users can view aircraft documents"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'aircraft-documents' AND
        auth.uid() IS NOT NULL
    );

-- Board members can upload aircraft documents
CREATE POLICY "Board members can upload aircraft documents"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'aircraft-documents' AND
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND 'board' = ANY(users.role)
        )
    );

-- Board members can delete aircraft documents
CREATE POLICY "Board members can delete aircraft documents"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'aircraft-documents' AND
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND 'board' = ANY(users.role)
        )
    );

-- =====================================================
-- 5. STORAGE POLICIES: USER DOCUMENTS
-- =====================================================

-- Users can upload their own documents (path should start with their user ID)
CREATE POLICY "Users can upload own documents"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'user-documents' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can view their own documents
CREATE POLICY "Users can view own documents"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'user-documents' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Board members can view all user documents
CREATE POLICY "Board members can view all user documents"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'user-documents' AND
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND 'board' = ANY(users.role)
        )
    );

-- Board members can upload user documents
CREATE POLICY "Board members can upload user documents"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'user-documents' AND
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND 'board' = ANY(users.role)
        )
    );

-- Users can delete their own unapproved documents
CREATE POLICY "Users can delete own documents"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'user-documents' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Board members can delete any user documents
CREATE POLICY "Board members can delete user documents"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'user-documents' AND
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND 'board' = ANY(users.role)
        )
    );

-- =====================================================
-- 6. STORAGE POLICIES: FLIGHT LOGS
-- =====================================================

-- Pilots can upload their own flight log PDFs
CREATE POLICY "Pilots can upload own flight logs"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'flight-logs' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can view their own flight logs
CREATE POLICY "Users can view own flight logs"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'flight-logs' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Board members can view all flight logs
CREATE POLICY "Board members can view all flight logs"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'flight-logs' AND
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND 'board' = ANY(users.role)
        )
    );

-- Board members can upload flight logs
CREATE POLICY "Board members can upload flight logs"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'flight-logs' AND
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND 'board' = ANY(users.role)
        )
    );

-- Board members can delete flight logs
CREATE POLICY "Board members can delete flight logs"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'flight-logs' AND
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND 'board' = ANY(users.role)
        )
    );

-- =====================================================
-- 7. STORAGE POLICIES: TANDEM DOCUMENTS (PUBLIC)
-- =====================================================

-- Public can view tandem documents (terms & conditions)
CREATE POLICY "Public can view tandem documents"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'tandem-documents');

-- Board members can upload tandem documents
CREATE POLICY "Board members can upload tandem documents"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'tandem-documents' AND
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND 'board' = ANY(users.role)
        )
    );

-- Board members can delete tandem documents
CREATE POLICY "Board members can delete tandem documents"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'tandem-documents' AND
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND 'board' = ANY(users.role)
        )
    );

-- =====================================================
-- COMMENTS
-- =====================================================

-- Note: Cannot add comment to storage schema (requires superuser privileges)
-- Storage schema is managed by Supabase and used for file uploads

-- Note: Bucket comments are stored in storage.buckets table metadata
-- Access patterns:
-- - documents: Board-only general document storage
-- - club-documents: Public club documents (bylaws, forms, etc.)
-- - aircraft-documents: Aircraft-specific documents, authenticated users can view
-- - user-documents: User-specific documents (licenses, medicals, etc.) organized by user ID
-- - flight-logs: M&B PDF sheets organized by pilot user ID
-- - tandem-documents: Public tandem registration documents (T&C, waivers)
