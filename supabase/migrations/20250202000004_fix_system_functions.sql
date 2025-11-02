-- Diagnostic and Fix for System Functions
-- This migration ensures all system functions are properly set up and users are correctly linked

-- =====================================================
-- 1. DIAGNOSTIC: Check current state
-- =====================================================

-- Show all functions and their system status
DO $$
DECLARE
    func_record RECORD;
BEGIN
    RAISE NOTICE '=== CURRENT FUNCTIONS IN DATABASE ===';
    FOR func_record IN
        SELECT id, name, code, is_system, active, category_id
        FROM public.functions_master
        ORDER BY name
    LOOP
        RAISE NOTICE 'Function: % | Code: % | System: % | Active: %',
            func_record.name,
            COALESCE(func_record.code, 'NULL'),
            func_record.is_system,
            func_record.active;
    END LOOP;
END $$;

-- =====================================================
-- 2. FIX: Ensure system functions have proper codes
-- =====================================================

-- Update existing functions that match system function names to have codes
UPDATE public.functions_master
SET
    code = 'pilot',
    is_system = true,
    active = true
WHERE LOWER(name) = 'pilot' AND (code IS NULL OR code != 'pilot');

UPDATE public.functions_master
SET
    code = 'flight_instructor',
    is_system = true,
    active = true
WHERE LOWER(name) IN ('flight instructor', 'flight_instructor', 'fluglehrer') AND (code IS NULL OR code != 'flight_instructor');

UPDATE public.functions_master
SET
    code = 'chief_pilot',
    is_system = true,
    active = true
WHERE LOWER(name) IN ('chief pilot', 'chief_pilot', 'chefpilot') AND (code IS NULL OR code != 'chief_pilot');

UPDATE public.functions_master
SET
    code = 'tandem_master',
    is_system = true,
    active = true
WHERE LOWER(name) IN ('tandem master', 'tandem_master', 'tandemmaster') AND (code IS NULL OR code != 'tandem_master');

UPDATE public.functions_master
SET
    code = 'skydive_instructor',
    is_system = true,
    active = true
WHERE LOWER(name) IN ('skydive instructor', 'skydive_instructor', 'fallschirmsprung-instruktor') AND (code IS NULL OR code != 'skydive_instructor');

UPDATE public.functions_master
SET
    code = 'sport_jumper',
    is_system = true,
    active = true
WHERE LOWER(name) IN ('sport jumper', 'sport_jumper', 'sportspringer') AND (code IS NULL OR code != 'sport_jumper');

UPDATE public.functions_master
SET
    code = 'manifest_coordinator',
    is_system = true,
    active = true
WHERE LOWER(name) IN ('manifest coordinator', 'manifest_coordinator', 'manifest-koordinator') AND (code IS NULL OR code != 'manifest_coordinator');

UPDATE public.functions_master
SET
    code = 'treasurer',
    is_system = true,
    active = true
WHERE LOWER(name) IN ('treasurer', 'kassenwart') AND (code IS NULL OR code != 'treasurer');

UPDATE public.functions_master
SET
    code = 'chairman',
    is_system = true,
    active = true
WHERE LOWER(name) IN ('chairman', 'vorsitzender') AND (code IS NULL OR code != 'chairman');

UPDATE public.functions_master
SET
    code = 'secretary',
    is_system = true,
    active = true
WHERE LOWER(name) IN ('secretary', 'schriftführer', 'schriftfuehrer') AND (code IS NULL OR code != 'secretary');

-- =====================================================
-- 3. ENSURE user_functions entries exist
-- =====================================================

-- Migrate any users who have functions in the old TEXT[] array but not in user_functions
DO $$
DECLARE
    user_record RECORD;
    func_name TEXT;
    func_id UUID;
BEGIN
    RAISE NOTICE '=== MIGRATING USER FUNCTIONS ===';

    -- Loop through all users with functions in old format
    FOR user_record IN
        SELECT id, functions, name, surname
        FROM public.users
        WHERE functions IS NOT NULL AND array_length(functions, 1) > 0
    LOOP
        RAISE NOTICE 'Processing user: % % (ID: %)', user_record.name, user_record.surname, user_record.id;

        -- Loop through each function ID in the array
        FOREACH func_name IN ARRAY user_record.functions
        LOOP
            -- Try to find matching function by ID (if it's a UUID) or by name
            SELECT id INTO func_id
            FROM public.functions_master
            WHERE id::text = func_name OR LOWER(name) = LOWER(func_name)
            LIMIT 1;

            -- If function exists, create user_function assignment
            IF func_id IS NOT NULL THEN
                INSERT INTO public.user_functions (user_id, function_id, assigned_at)
                VALUES (user_record.id, func_id, NOW())
                ON CONFLICT (user_id, function_id) DO NOTHING;

                RAISE NOTICE '  - Assigned function: %', func_id;
            ELSE
                RAISE NOTICE '  - Could not find function: %', func_name;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- =====================================================
-- 4. REFRESH materialized view
-- =====================================================

REFRESH MATERIALIZED VIEW public.users_with_functions_search;

-- =====================================================
-- 5. FINAL DIAGNOSTIC: Show user counts per function
-- =====================================================

DO $$
DECLARE
    func_record RECORD;
    user_count INTEGER;
BEGIN
    RAISE NOTICE '=== USERS PER FUNCTION ===';
    FOR func_record IN
        SELECT fm.id, fm.name, fm.code, fm.is_system
        FROM public.functions_master fm
        WHERE fm.active = true
        ORDER BY fm.name
    LOOP
        SELECT COUNT(DISTINCT uf.user_id) INTO user_count
        FROM public.user_functions uf
        WHERE uf.function_id = func_record.id;

        RAISE NOTICE 'Function: % (code: %) - % users',
            func_record.name,
            COALESCE(func_record.code, 'NO CODE'),
            user_count;
    END LOOP;
END $$;

-- Add helpful comment
COMMENT ON TABLE public.functions_master IS 'Functions for RBAC system. System functions (is_system=true) cannot be deleted and have immutable codes used in application logic.';
