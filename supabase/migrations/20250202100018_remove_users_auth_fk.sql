-- =====================================================
-- REMOVE FOREIGN KEY CONSTRAINT FROM USERS TO AUTH
-- =====================================================
-- This allows auth.users records to be deleted independently
-- while keeping public.users records for historical purposes
-- (e.g., flight logs, created_by references)
-- =====================================================

-- Drop the foreign key constraint from public.users.id to auth.users.id
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Note: The id field remains a UUID and can still reference auth.users.id,
-- but now there's no database-level enforcement of the relationship.
-- This allows:
-- 1. Deleting auth.users while keeping public.users (for GDPR compliance)
-- 2. public.users.id continues to work as reference in flight logs, etc.
