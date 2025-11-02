-- =====================================================
-- HYBRID RBAC SYSTEM
-- =====================================================
-- This migration creates a complete role-based access control system
-- with system functions (hardcoded) and custom functions (board-defined)
--
-- Features:
-- - Function categories (Aviation, Skydiving, Operations, Administration)
-- - System functions with protected codes
-- - User-function many-to-many relationships
-- - Materialized views for performance
-- - Recent selections tracking for autocomplete
-- - RLS policies for security

-- =====================================================
-- 1. FUNCTION CATEGORIES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.function_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    name_de TEXT NOT NULL,
    description_en TEXT,
    description_de TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT function_categories_code_check CHECK (LENGTH(code) > 0),
    CONSTRAINT function_categories_name_en_check CHECK (LENGTH(name_en) > 0),
    CONSTRAINT function_categories_name_de_check CHECK (LENGTH(name_de) > 0)
);

CREATE INDEX IF NOT EXISTS idx_function_categories_sort_order ON public.function_categories(sort_order);

-- Seed categories
INSERT INTO public.function_categories (code, name_en, name_de, description_en, description_de, sort_order) VALUES
    ('aviation', 'Aviation', 'Luftfahrt', 'Aviation-related functions', 'Luftfahrtbezogene Funktionen', 10),
    ('skydiving', 'Skydiving', 'Fallschirmspringen', 'Skydiving operations', 'Fallschirmspringoperationen', 20),
    ('operations', 'Operations', 'Betrieb', 'Operational roles', 'Betriebsrollen', 30),
    ('administration', 'Administration', 'Verwaltung', 'Administrative functions', 'Verwaltungsfunktionen', 40),
    ('custom', 'Custom', 'Benutzerdefiniert', 'Custom club-specific functions', 'Benutzerdefinierte Vereinsfunktionen', 100)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 2. UPDATE FUNCTIONS_MASTER TABLE
-- =====================================================
ALTER TABLE public.functions_master
    ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.function_categories(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS code TEXT,
    ADD COLUMN IF NOT EXISTS name_de TEXT,
    ADD COLUMN IF NOT EXISTS description_de TEXT,
    ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add unique index for function codes
CREATE UNIQUE INDEX IF NOT EXISTS idx_functions_master_code_unique
    ON public.functions_master(code)
    WHERE code IS NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_functions_master_active ON public.functions_master(active);
CREATE INDEX IF NOT EXISTS idx_functions_master_is_system ON public.functions_master(is_system);
CREATE INDEX IF NOT EXISTS idx_functions_master_category_id ON public.functions_master(category_id);

-- =====================================================
-- 3. USER_FUNCTIONS JUNCTION TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_functions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    function_id UUID NOT NULL REFERENCES public.functions_master(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    valid_from DATE,
    valid_until DATE,
    notes TEXT,

    CONSTRAINT user_functions_unique UNIQUE(user_id, function_id)
);

CREATE INDEX IF NOT EXISTS idx_user_functions_user_id ON public.user_functions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_functions_function_id ON public.user_functions(function_id);
CREATE INDEX IF NOT EXISTS idx_user_functions_assigned_by ON public.user_functions(assigned_by);
CREATE INDEX IF NOT EXISTS idx_user_functions_validity ON public.user_functions(valid_from, valid_until);

-- =====================================================
-- 4. SEED SYSTEM FUNCTIONS
-- =====================================================
DO $$
DECLARE
    cat_aviation UUID;
    cat_skydiving UUID;
    cat_operations UUID;
    cat_administration UUID;
BEGIN
    -- Get category IDs
    SELECT id INTO cat_aviation FROM public.function_categories WHERE code = 'aviation';
    SELECT id INTO cat_skydiving FROM public.function_categories WHERE code = 'skydiving';
    SELECT id INTO cat_operations FROM public.function_categories WHERE code = 'operations';
    SELECT id INTO cat_administration FROM public.function_categories WHERE code = 'administration';

    -- Update existing functions that match by name to add codes
    UPDATE public.functions_master SET code = 'pilot', is_system = true, active = true, category_id = cat_aviation
    WHERE LOWER(name) = 'pilot' AND (code IS NULL OR code != 'pilot');

    UPDATE public.functions_master SET code = 'flight_instructor', is_system = true, active = true, category_id = cat_aviation
    WHERE LOWER(name) IN ('flight instructor', 'flight_instructor', 'fluglehrer') AND (code IS NULL OR code != 'flight_instructor');

    UPDATE public.functions_master SET code = 'chief_pilot', is_system = true, active = true, category_id = cat_aviation
    WHERE LOWER(name) IN ('chief pilot', 'chief_pilot', 'chefpilot') AND (code IS NULL OR code != 'chief_pilot');

    UPDATE public.functions_master SET code = 'tandem_master', is_system = true, active = true, category_id = cat_skydiving
    WHERE LOWER(name) IN ('tandem master', 'tandem_master', 'tandemmaster') AND (code IS NULL OR code != 'tandem_master');

    UPDATE public.functions_master SET code = 'skydive_instructor', is_system = true, active = true, category_id = cat_skydiving
    WHERE LOWER(name) IN ('skydive instructor', 'skydive_instructor', 'fallschirmsprung-instruktor') AND (code IS NULL OR code != 'skydive_instructor');

    UPDATE public.functions_master SET code = 'sport_jumper', is_system = true, active = true, category_id = cat_skydiving
    WHERE LOWER(name) IN ('sport jumper', 'sport_jumper', 'sportspringer') AND (code IS NULL OR code != 'sport_jumper');

    UPDATE public.functions_master SET code = 'manifest_coordinator', is_system = true, active = true, category_id = cat_operations
    WHERE LOWER(name) IN ('manifest coordinator', 'manifest_coordinator', 'manifest-koordinator') AND (code IS NULL OR code != 'manifest_coordinator');

    UPDATE public.functions_master SET code = 'treasurer', is_system = true, active = true, category_id = cat_administration
    WHERE LOWER(name) IN ('treasurer', 'kassenwart') AND (code IS NULL OR code != 'treasurer');

    UPDATE public.functions_master SET code = 'chairman', is_system = true, active = true, category_id = cat_administration
    WHERE LOWER(name) IN ('chairman', 'vorsitzender') AND (code IS NULL OR code != 'chairman');

    UPDATE public.functions_master SET code = 'secretary', is_system = true, active = true, category_id = cat_administration
    WHERE LOWER(name) IN ('secretary', 'schriftführer', 'schriftfuehrer') AND (code IS NULL OR code != 'secretary');

    -- Insert system functions if they don't exist yet
    INSERT INTO public.functions_master (code, name, name_de, description, description_de, is_system, active, category_id, sort_order)
    SELECT * FROM (VALUES
        ('pilot', 'Pilot', 'Pilot', 'Licensed pilot authorized to fly club aircraft', 'Lizenzierter Pilot berechtigt Vereinsflugzeuge zu fliegen', true, true, cat_aviation, 10),
        ('flight_instructor', 'Flight Instructor', 'Fluglehrer', 'Certified flight instructor', 'Zertifizierter Fluglehrer', true, true, cat_aviation, 20),
        ('chief_pilot', 'Chief Pilot', 'Chefpilot', 'Chief pilot responsible for flight operations', 'Chefpilot verantwortlich für Flugbetrieb', true, true, cat_aviation, 30),
        ('tandem_master', 'Tandem Master', 'Tandemmaster', 'Certified tandem instructor', 'Zertifizierter Tandem-Instruktor', true, true, cat_skydiving, 10),
        ('skydive_instructor', 'Skydive Instructor', 'Fallschirmsprung-Instruktor', 'Certified skydiving instructor', 'Zertifizierter Fallschirmsprung-Instruktor', true, true, cat_skydiving, 20),
        ('sport_jumper', 'Sport Jumper', 'Sportspringer', 'Licensed sport skydiver', 'Lizenzierter Sportfallschirmspringer', true, true, cat_skydiving, 30),
        ('manifest_coordinator', 'Manifest Coordinator', 'Manifest-Koordinator', 'Coordinates flight manifest and operations', 'Koordiniert Flugmanifest und Operationen', true, true, cat_operations, 10),
        ('treasurer', 'Treasurer', 'Kassenwart', 'Club treasurer managing finances', 'Vereinskassenwart für Finanzen', true, true, cat_administration, 10),
        ('chairman', 'Chairman', 'Vorsitzender', 'Club chairman', 'Vereinsvorsitzender', true, true, cat_administration, 20),
        ('secretary', 'Secretary', 'Schriftführer', 'Club secretary', 'Vereinsschriftführer', true, true, cat_administration, 30)
    ) AS v(code, name, name_de, description, description_de, is_system, active, category_id, sort_order)
    WHERE NOT EXISTS (
        SELECT 1 FROM public.functions_master
        WHERE functions_master.name = v.name OR functions_master.code = v.code
    );
END $$;

-- =====================================================
-- 5. MIGRATE EXISTING DATA
-- =====================================================
DO $$
DECLARE
    user_record RECORD;
    func_name TEXT;
    func_id UUID;
BEGIN
    -- Loop through all users with functions in old TEXT[] format
    FOR user_record IN
        SELECT id, functions, name, surname
        FROM public.users
        WHERE functions IS NOT NULL AND array_length(functions, 1) > 0
    LOOP
        -- Loop through each function in the array
        FOREACH func_name IN ARRAY user_record.functions
        LOOP
            -- Try to find matching function by ID or name
            SELECT id INTO func_id
            FROM public.functions_master
            WHERE id::text = func_name OR LOWER(name) = LOWER(func_name)
            LIMIT 1;

            -- If function exists, create user_function assignment
            IF func_id IS NOT NULL THEN
                INSERT INTO public.user_functions (user_id, function_id, assigned_at)
                VALUES (user_record.id, func_id, NOW())
                ON CONFLICT (user_id, function_id) DO NOTHING;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- =====================================================
-- 6. HELPER VIEWS
-- =====================================================

-- View for users with their functions (existing view, kept for compatibility)
CREATE OR REPLACE VIEW public.users_with_functions AS
SELECT
    u.id,
    u.email,
    u.name,
    u.surname,
    u.role,
    u.license_number,
    u.created_at,
    u.updated_at,
    COALESCE(
        json_agg(
            json_build_object(
                'id', fm.id,
                'code', fm.code,
                'name', fm.name,
                'name_de', fm.name_de,
                'is_system', fm.is_system,
                'category_id', fm.category_id,
                'assigned_at', uf.assigned_at,
                'valid_from', uf.valid_from,
                'valid_until', uf.valid_until
            ) ORDER BY fm.sort_order
        ) FILTER (WHERE fm.id IS NOT NULL),
        '[]'::json
    ) AS functions,
    COALESCE(
        array_agg(fm.code ORDER BY fm.sort_order) FILTER (WHERE fm.code IS NOT NULL),
        ARRAY[]::TEXT[]
    ) AS function_codes
FROM public.users u
LEFT JOIN public.user_functions uf ON u.id = uf.user_id
LEFT JOIN public.functions_master fm ON uf.function_id = fm.id AND fm.active = true
GROUP BY u.id, u.email, u.name, u.surname, u.role, u.license_number, u.created_at, u.updated_at;

-- View for functions with stats
CREATE OR REPLACE VIEW public.functions_with_stats AS
SELECT
    fm.*,
    fc.code AS category_code,
    fc.name_en AS category_name_en,
    fc.name_de AS category_name_de,
    COUNT(DISTINCT uf.user_id) AS user_count,
    COUNT(DISTINCT uf.user_id) FILTER (
        WHERE uf.valid_from IS NULL OR uf.valid_from <= CURRENT_DATE
        AND (uf.valid_until IS NULL OR uf.valid_until >= CURRENT_DATE)
    ) AS active_user_count
FROM public.functions_master fm
LEFT JOIN public.function_categories fc ON fm.category_id = fc.id
LEFT JOIN public.user_functions uf ON fm.id = uf.function_id
GROUP BY fm.id, fc.code, fc.name_en, fc.name_de;

-- Materialized view for fast user search
CREATE MATERIALIZED VIEW IF NOT EXISTS public.users_with_functions_search AS
SELECT
  u.id,
  u.name,
  u.surname,
  u.email,
  u.role,
  m.start_date as membership_start_date,
  m.end_date as membership_end_date,
  mt.member_category as membership_category,
  m.status as membership_status,
  COALESCE(ARRAY_AGG(fm.code) FILTER (WHERE fm.code IS NOT NULL), ARRAY[]::TEXT[]) as function_codes,
  COALESCE(ARRAY_AGG(fm.name) FILTER (WHERE fm.name IS NOT NULL), ARRAY[]::TEXT[]) as function_names,
  COALESCE(STRING_AGG(fm.name, ', ') FILTER (WHERE fm.name IS NOT NULL), '') as functions_display,
  COALESCE(ARRAY_AGG(fc.code) FILTER (WHERE fc.code IS NOT NULL), ARRAY[]::TEXT[]) as category_codes
FROM public.users u
LEFT JOIN public.user_memberships m ON u.id = m.user_id AND m.status = 'active'
LEFT JOIN public.membership_types mt ON m.membership_type_id = mt.id
LEFT JOIN public.user_functions uf ON u.id = uf.user_id
LEFT JOIN public.functions_master fm ON uf.function_id = fm.id AND fm.active = TRUE
LEFT JOIN public.function_categories fc ON fm.category_id = fc.id
GROUP BY u.id, u.name, u.surname, u.email, u.role,
         m.start_date, m.end_date, mt.member_category, m.status;

-- Create unique index for CONCURRENT refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_functions_search_id ON public.users_with_functions_search(id);

-- Create indexes on materialized view
CREATE INDEX IF NOT EXISTS idx_users_functions_search_codes ON public.users_with_functions_search USING gin(function_codes);
CREATE INDEX IF NOT EXISTS idx_users_functions_search_name ON public.users_with_functions_search(name, surname);
CREATE INDEX IF NOT EXISTS idx_users_functions_search_membership_status ON public.users_with_functions_search(membership_status);
CREATE INDEX IF NOT EXISTS idx_users_functions_search_membership_date ON public.users_with_functions_search(membership_start_date);
CREATE INDEX IF NOT EXISTS idx_users_functions_search_category ON public.users_with_functions_search USING gin(category_codes);

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION public.refresh_users_with_functions_search()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.users_with_functions_search;
END;
$$;

-- Trigger function to auto-refresh
CREATE OR REPLACE FUNCTION public.trigger_refresh_users_search()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.refresh_users_with_functions_search();
  RETURN NULL;
END;
$$;

-- Add triggers
DROP TRIGGER IF EXISTS trigger_refresh_users_search_on_user_change ON public.users;
CREATE TRIGGER trigger_refresh_users_search_on_user_change
AFTER INSERT OR UPDATE OR DELETE ON public.users
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_refresh_users_search();

DROP TRIGGER IF EXISTS trigger_refresh_users_search_on_function_change ON public.user_functions;
CREATE TRIGGER trigger_refresh_users_search_on_function_change
AFTER INSERT OR UPDATE OR DELETE ON public.user_functions
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_refresh_users_search();

-- Check if user has a function
CREATE OR REPLACE FUNCTION public.user_has_function(
    p_user_id UUID,
    p_function_code TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_functions uf
        JOIN public.functions_master fm ON uf.function_id = fm.id
        WHERE uf.user_id = p_user_id
        AND fm.code = p_function_code
        AND fm.active = true
        AND (uf.valid_from IS NULL OR uf.valid_from <= CURRENT_DATE)
        AND (uf.valid_until IS NULL OR uf.valid_until >= CURRENT_DATE)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user has any of the functions
CREATE OR REPLACE FUNCTION public.user_has_any_function(
    p_user_id UUID,
    p_function_codes TEXT[]
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_functions uf
        JOIN public.functions_master fm ON uf.function_id = fm.id
        WHERE uf.user_id = p_user_id
        AND fm.code = ANY(p_function_codes)
        AND fm.active = true
        AND (uf.valid_from IS NULL OR uf.valid_from <= CURRENT_DATE)
        AND (uf.valid_until IS NULL OR uf.valid_until >= CURRENT_DATE)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get users by function
CREATE OR REPLACE FUNCTION public.get_users_by_function(
    p_function_codes TEXT[]
)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    name TEXT,
    surname TEXT,
    function_codes TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.email,
        u.name,
        u.surname,
        array_agg(DISTINCT fm.code) AS function_codes
    FROM public.users u
    JOIN public.user_functions uf ON u.id = uf.user_id
    JOIN public.functions_master fm ON uf.function_id = fm.id
    WHERE fm.code = ANY(p_function_codes)
    AND fm.active = true
    AND (uf.valid_from IS NULL OR uf.valid_from <= CURRENT_DATE)
    AND (uf.valid_until IS NULL OR uf.valid_until >= CURRENT_DATE)
    GROUP BY u.id, u.email, u.name, u.surname
    ORDER BY u.surname, u.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- 8. RECENT SELECTIONS TRACKING
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_recent_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  selected_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  context TEXT NOT NULL,
  selected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, selected_user_id, context)
);

CREATE INDEX IF NOT EXISTS idx_recent_selections_lookup
ON public.user_recent_selections(user_id, context, selected_at DESC);

-- Track a selection
CREATE OR REPLACE FUNCTION public.track_user_selection(
  p_user_id UUID,
  p_selected_user_id UUID,
  p_context TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_recent_selections (user_id, selected_user_id, context)
  VALUES (p_user_id, p_selected_user_id, p_context)
  ON CONFLICT (user_id, selected_user_id, context)
  DO UPDATE SET selected_at = NOW();

  -- Keep only last 10 selections per user per context
  DELETE FROM public.user_recent_selections
  WHERE id IN (
    SELECT id FROM public.user_recent_selections
    WHERE user_id = p_user_id AND context = p_context
    ORDER BY selected_at DESC
    OFFSET 10
  );
END;
$$;

-- Get recent selections
CREATE OR REPLACE FUNCTION public.get_recent_selections(
  p_user_id UUID,
  p_context TEXT,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  surname TEXT,
  email TEXT,
  functions_display TEXT,
  function_codes TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    uwf.id,
    uwf.name,
    uwf.surname,
    uwf.email,
    uwf.functions_display,
    uwf.function_codes
  FROM public.user_recent_selections urs
  JOIN public.users_with_functions_search uwf ON urs.selected_user_id = uwf.id
  WHERE urs.user_id = p_user_id
    AND urs.context = p_context
    AND uwf.membership_status IN ('active', 'pending')
  ORDER BY urs.selected_at DESC
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- 9. PROTECTION TRIGGERS
-- =====================================================

-- Prevent deletion of system functions
CREATE OR REPLACE FUNCTION public.prevent_system_function_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_system = true THEN
        RAISE EXCEPTION 'Cannot delete system function: %. System functions can only be deactivated.', OLD.name;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_system_function_deletion ON public.functions_master;
CREATE TRIGGER prevent_system_function_deletion
    BEFORE DELETE ON public.functions_master
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_system_function_deletion();

-- Prevent modification of system function code
CREATE OR REPLACE FUNCTION public.prevent_system_function_code_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_system = true AND OLD.code != NEW.code THEN
        RAISE EXCEPTION 'Cannot modify code of system function: %. System function codes are immutable.', OLD.name;
    END IF;

    IF OLD.is_system = true AND NEW.is_system = false THEN
        RAISE EXCEPTION 'Cannot change system function to custom function: %.', OLD.name;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_system_function_code_modification ON public.functions_master;
CREATE TRIGGER prevent_system_function_code_modification
    BEFORE UPDATE ON public.functions_master
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_system_function_code_modification();

-- Update updated_at
DROP TRIGGER IF EXISTS update_functions_master_updated_at ON public.functions_master;
CREATE TRIGGER update_functions_master_updated_at
    BEFORE UPDATE ON public.functions_master
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 10. RLS POLICIES
-- =====================================================

ALTER TABLE public.function_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_functions ENABLE ROW LEVEL SECURITY;

-- Function Categories: Read - all authenticated users
DROP POLICY IF EXISTS "Function categories readable by authenticated users" ON public.function_categories;
CREATE POLICY "Function categories readable by authenticated users"
    ON public.function_categories FOR SELECT
    TO authenticated
    USING (true);

-- Function Categories: Manage - only board members
DROP POLICY IF EXISTS "Board can manage function categories" ON public.function_categories;
CREATE POLICY "Board can manage function categories"
    ON public.function_categories FOR ALL
    TO authenticated
    USING (public.is_board_member(auth.uid()))
    WITH CHECK (public.is_board_member(auth.uid()));

-- User Functions: Read - users can see their own, board can see all
DROP POLICY IF EXISTS "Users can view own function assignments" ON public.user_functions;
CREATE POLICY "Users can view own function assignments"
    ON public.user_functions FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_board_member(auth.uid()));

-- User Functions: Manage - only board members
DROP POLICY IF EXISTS "Board can manage user function assignments" ON public.user_functions;
CREATE POLICY "Board can manage user function assignments"
    ON public.user_functions FOR ALL
    TO authenticated
    USING (public.is_board_member(auth.uid()))
    WITH CHECK (public.is_board_member(auth.uid()));

-- =====================================================
-- 11. INITIAL REFRESH
-- =====================================================
SELECT public.refresh_users_with_functions_search();

-- =====================================================
-- 12. COMMENTS
-- =====================================================
COMMENT ON TABLE public.function_categories IS 'Categories for organizing functions (aviation, skydiving, operations, administration)';
COMMENT ON TABLE public.user_functions IS 'Many-to-many relationship between users and their assigned functions';
COMMENT ON TABLE public.user_recent_selections IS 'Tracks recently selected users for autocomplete suggestions';
COMMENT ON COLUMN public.functions_master.is_system IS 'System functions cannot be deleted, only deactivated. Code cannot be changed.';
COMMENT ON COLUMN public.functions_master.code IS 'Unique code identifier for system functions. Used in code for permission checks.';
COMMENT ON COLUMN public.functions_master.active IS 'Inactive functions are hidden from selection but assignments are preserved';
COMMENT ON COLUMN public.user_functions.valid_from IS 'Optional: Date from which this function assignment is valid';
COMMENT ON COLUMN public.user_functions.valid_until IS 'Optional: Date until which this function assignment is valid';
COMMENT ON MATERIALIZED VIEW public.users_with_functions_search IS 'Materialized view combining users with their functions for efficient searching';
COMMENT ON FUNCTION public.track_user_selection IS 'Records a user selection and maintains a limited history';
COMMENT ON FUNCTION public.get_recent_selections IS 'Retrieves recent user selections for a specific context';
COMMENT ON FUNCTION public.user_has_function(UUID, TEXT) IS 'Check if user has a specific function by code';
COMMENT ON FUNCTION public.user_has_any_function(UUID, TEXT[]) IS 'Check if user has any of the specified functions';
COMMENT ON FUNCTION public.get_users_by_function(TEXT[]) IS 'Get all users with specific function codes';
