-- =====================================================
-- ALLOW USERS TO UPDATE THEIR OWN DOCUMENTS
-- =====================================================
-- This migration adds a policy to allow users to update
-- their own documents (for renewal purposes).
-- Users can only update documents they uploaded.
--
-- =====================================================

-- Users can update their own documents (for renewal)
CREATE POLICY "Users can update own documents"
    ON public.documents FOR UPDATE
    TO authenticated
    USING (uploaded_by = auth.uid() OR user_id = auth.uid())
    WITH CHECK (uploaded_by = auth.uid() OR user_id = auth.uid());
