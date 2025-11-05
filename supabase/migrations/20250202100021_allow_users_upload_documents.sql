-- =====================================================
-- ALLOW USERS TO UPLOAD THEIR OWN DOCUMENTS
-- =====================================================
-- This migration adds a storage policy to allow authenticated users
-- to upload their own documents to the documents bucket.
-- Files must be in a folder named with the user's ID.
--
-- =====================================================

-- Users can upload their own documents (path should start with their user ID)
CREATE POLICY "Users can upload own documents to documents bucket"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'documents' AND
        auth.uid() IS NOT NULL AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can view their own documents in documents bucket
CREATE POLICY "Users can view own documents in documents bucket"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'documents' AND
        auth.uid() IS NOT NULL AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can delete their own documents in documents bucket
CREATE POLICY "Users can delete own documents in documents bucket"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'documents' AND
        auth.uid() IS NOT NULL AND
        (storage.foldername(name))[1] = auth.uid()::text
    );
