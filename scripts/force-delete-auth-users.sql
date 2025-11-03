-- =====================================================
-- FORCE DELETE CORRUPTED AUTH USERS
-- =====================================================
-- This script manually removes auth users that can't be deleted via the UI
-- The public.users table has @deleted.local emails, but auth.users still has original emails
-- We need to find user IDs from public.users and delete from auth using those IDs
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Find the user IDs from public.users table (those marked as deleted)
SELECT
    u.id,
    u.name,
    u.surname,
    u.email AS public_email,
    au.email AS auth_email
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email LIKE '%@deleted.local';

-- Step 2: Delete from auth.identities first (foreign key constraint)
DELETE FROM auth.identities
WHERE user_id::uuid IN (
    SELECT id::uuid FROM public.users WHERE email LIKE '%@deleted.local'
);

-- Step 3: Delete from auth.sessions
DELETE FROM auth.sessions
WHERE user_id::uuid IN (
    SELECT id::uuid FROM public.users WHERE email LIKE '%@deleted.local'
);

-- Step 4: Delete from auth.refresh_tokens
DELETE FROM auth.refresh_tokens
WHERE user_id::uuid IN (
    SELECT id::uuid FROM public.users WHERE email LIKE '%@deleted.local'
);

-- Step 5: Delete from auth.mfa_factors (if exists)
DELETE FROM auth.mfa_factors
WHERE user_id::uuid IN (
    SELECT id::uuid FROM public.users WHERE email LIKE '%@deleted.local'
);

-- Step 6: Delete from auth.mfa_amr_claims (if exists)
DELETE FROM auth.mfa_amr_claims
WHERE session_id::uuid IN (
    SELECT id::uuid FROM auth.sessions WHERE user_id::uuid IN (
        SELECT id::uuid FROM public.users WHERE email LIKE '%@deleted.local'
    )
);

-- Step 7: Now delete the users from auth.users using the IDs from public.users
DELETE FROM auth.users
WHERE id::uuid IN (
    SELECT id::uuid FROM public.users WHERE email LIKE '%@deleted.local'
);

-- Step 8: Verify they're gone from auth
SELECT
    u.id,
    u.name,
    u.surname,
    u.email AS public_email,
    au.email AS auth_email
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email LIKE '%@deleted.local';

-- The auth_email column should now be NULL (users deleted from auth)
-- But they still exist in public.users table (for historical records)
