-- Hybrid RBAC System Migration
-- This migration creates a hybrid role-based access control system
-- with both system functions (hardcoded) and custom functions (board-defined)

-- =====================================================
-- 1. CREATE FUNCTION CATEGORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.function_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Index for sorting
CREATE INDEX idx_function_categories_sort_order ON public.function_categories(sort_order);

-- =====================================================
-- 2. UPDATE FUNCTIONS_MASTER TABLE STRUCTURE
-- =====================================================

-- Add new columns to functions_master
ALTER TABLE public.functions_master
    ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.function_categories(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS code TEXT,
    ADD COLUMN IF NOT EXISTS name_de TEXT,
    ADD COLUMN IF NOT EXISTS description_de TEXT,
    ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add unique constraint on code for system functions
-- Partial index allows NULL codes for custom functions
CREATE UNIQUE INDEX IF NOT EXISTS idx_functions_master_code_unique
    ON public.functions_master(code)
    WHERE code IS NOT NULL;

-- Add index for active functions
CREATE INDEX idx_functions_master_active ON public.functions_master(active);

-- Add index for system functions
CREATE INDEX idx_functions_master_is_system ON public.functions_master(is_system);

-- Add index for category lookup
CREATE INDEX idx_functions_master_category_id ON public.functions_master(category_id);

-- =====================================================
-- 3. CREATE USER_FUNCTIONS JUNCTION TABLE
-- =====================================================
-- This replaces the TEXT[] array in users table with a proper many-to-many relationship

CREATE TABLE IF NOT EXISTS public.user_functions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    function_id UUID NOT NULL REFERENCES public.functions_master(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    valid_from DATE,
    valid_until DATE,
    notes TEXT,

    -- Prevent duplicate assignments
    CONSTRAINT user_functions_unique UNIQUE(user_id, function_id)
);

-- Indexes for efficient lookups
CREATE INDEX idx_user_functions_user_id ON public.user_functions(user_id);
CREATE INDEX idx_user_functions_function_id ON public.user_functions(function_id);
CREATE INDEX idx_user_functions_assigned_by ON public.user_functions(assigned_by);
CREATE INDEX idx_user_functions_validity ON public.user_functions(valid_from, valid_until);

-- =====================================================
-- 4. SEED FUNCTION CATEGORIES
-- =====================================================

INSERT INTO public.function_categories (code, name_en, name_de, description_en, description_de, sort_order) VALUES
    ('aviation', 'Aviation', 'Luftfahrt', 'Aviation-related functions', 'Luftfahrtbezogene Funktionen', 10),
    ('skydiving', 'Skydiving', 'Fallschirmspringen', 'Skydiving operations', 'Fallschirmspringoperationen', 20),
    ('operations', 'Operations', 'Betrieb', 'Operational roles', 'Betriebsrollen', 30),
    ('administration', 'Administration', 'Verwaltung', 'Administrative functions', 'Verwaltungsfunktionen', 40),
    ('custom', 'Custom', 'Benutzerdefiniert', 'Custom club-specific functions', 'Benutzerdefinierte Vereinsfunktionen', 100)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 5. SEED SYSTEM FUNCTIONS
-- =====================================================

-- Get category IDs
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

    -- Update existing functions that match by name to add the code and system fields
    UPDATE public.functions_master fm SET
        code = v.code,
        name_de = v.name_de,
        description = v.description,
        description_de = v.description_de,
        category_id = v.category_id,
        sort_order = v.sort_order,
        is_system = true,
        active = true
    FROM (VALUES
        ('pilot', 'Pilot', 'Pilot', 'Licensed pilot authorized to fly club aircraft', 'Lizenzierter Pilot berechtigt Vereinsflugzeuge zu fliegen', cat_aviation, 10),
        ('flight_instructor', 'Flight Instructor', 'Fluglehrer', 'Certified flight instructor', 'Zertifizierter Fluglehrer', cat_aviation, 20),
        ('chief_pilot', 'Chief Pilot', 'Chefpilot', 'Chief pilot responsible for flight operations', 'Chefpilot verantwortlich für Flugbetrieb', cat_aviation, 30),
        ('tandem_master', 'Tandem Master', 'Tandemmaster', 'Certified tandem instructor', 'Zertifizierter Tandem-Instruktor', cat_skydiving, 10),
        ('skydive_instructor', 'Skydive Instructor', 'Fallschirmsprung-Instruktor', 'Certified skydiving instructor', 'Zertifizierter Fallschirmsprung-Instruktor', cat_skydiving, 20),
        ('sport_jumper', 'Sport Jumper', 'Sportspringer', 'Licensed sport skydiver', 'Lizenzierter Sportfallschirmspringer', cat_skydiving, 30),
        ('manifest_coordinator', 'Manifest Coordinator', 'Manifest-Koordinator', 'Coordinates flight manifest and operations', 'Koordiniert Flugmanifest und Operationen', cat_operations, 10),
        ('treasurer', 'Treasurer', 'Kassenwart', 'Club treasurer managing finances', 'Vereinskassenwart für Finanzen', cat_administration, 10),
        ('chairman', 'Chairman', 'Vorsitzender', 'Club chairman', 'Vereinsvorsitzender', cat_administration, 20),
        ('secretary', 'Secretary', 'Schriftführer', 'Club secretary', 'Vereinsschriftführer', cat_administration, 30)
    ) AS v(code, name, name_de, description, description_de, category_id, sort_order)
    WHERE fm.name = v.name;

    -- Insert only functions that don't exist yet (by name or code)
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
-- 6. MIGRATE EXISTING DATA
-- =====================================================

-- Migrate existing function assignments from users.functions TEXT[] to user_functions table
DO $$
DECLARE
    user_record RECORD;
    func_name TEXT;
    func_id UUID;
BEGIN
    -- Loop through all users with functions
    FOR user_record IN
        SELECT id, functions
        FROM public.users
        WHERE functions IS NOT NULL AND array_length(functions, 1) > 0
    LOOP
        -- Loop through each function name in the array
        FOREACH func_name IN ARRAY user_record.functions
        LOOP
            -- Try to find matching function by name
            SELECT id INTO func_id
            FROM public.functions_master
            WHERE LOWER(name) = LOWER(func_name)
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
-- 7. CREATE HELPER VIEWS
-- =====================================================

-- View for users with their functions
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
    -- Aggregate function details
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
    -- Array of function codes for easy checking
    COALESCE(
        array_agg(fm.code ORDER BY fm.sort_order) FILTER (WHERE fm.code IS NOT NULL),
        ARRAY[]::TEXT[]
    ) AS function_codes
FROM public.users u
LEFT JOIN public.user_functions uf ON u.id = uf.user_id
LEFT JOIN public.functions_master fm ON uf.function_id = fm.id AND fm.active = true
GROUP BY u.id, u.email, u.name, u.surname, u.role, u.license_number, u.created_at, u.updated_at;

-- View for functions with assigned user count
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

-- =====================================================
-- 8. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to check if user has a specific system function
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

-- Function to check if user has any of the specified functions
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

-- Function to get users by function code(s)
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
-- 9. CREATE CONSTRAINTS TO PROTECT SYSTEM FUNCTIONS
-- =====================================================

-- Trigger to prevent deletion of system functions
CREATE OR REPLACE FUNCTION public.prevent_system_function_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_system = true THEN
        RAISE EXCEPTION 'Cannot delete system function: %. System functions can only be deactivated.', OLD.name;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_system_function_deletion
    BEFORE DELETE ON public.functions_master
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_system_function_deletion();

-- Trigger to prevent modification of system function code
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

CREATE TRIGGER prevent_system_function_code_modification
    BEFORE UPDATE ON public.functions_master
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_system_function_code_modification();

-- Update updated_at on functions_master
CREATE TRIGGER update_functions_master_updated_at
    BEFORE UPDATE ON public.functions_master
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 10. UPDATE RLS POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.function_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_functions ENABLE ROW LEVEL SECURITY;

-- Function Categories: Read - all authenticated users
CREATE POLICY "Function categories readable by authenticated users"
    ON public.function_categories FOR SELECT
    TO authenticated
    USING (true);

-- Function Categories: Manage - only board members
CREATE POLICY "Board can manage function categories"
    ON public.function_categories FOR ALL
    TO authenticated
    USING (public.is_board_member(auth.uid()))
    WITH CHECK (public.is_board_member(auth.uid()));

-- User Functions: Read - users can see their own functions, board can see all
CREATE POLICY "Users can view own function assignments"
    ON public.user_functions FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_board_member(auth.uid()));

-- User Functions: Manage - only board members can assign/remove functions
CREATE POLICY "Board can manage user function assignments"
    ON public.user_functions FOR ALL
    TO authenticated
    USING (public.is_board_member(auth.uid()))
    WITH CHECK (public.is_board_member(auth.uid()));

-- =====================================================
-- 11. COMMENTS (Documentation)
-- =====================================================

COMMENT ON TABLE public.function_categories IS 'Categories for organizing functions (aviation, skydiving, operations, administration)';
COMMENT ON TABLE public.user_functions IS 'Many-to-many relationship between users and their assigned functions';
COMMENT ON COLUMN public.functions_master.is_system IS 'System functions cannot be deleted, only deactivated. Code cannot be changed.';
COMMENT ON COLUMN public.functions_master.code IS 'Unique code identifier for system functions. Used in code for permission checks.';
COMMENT ON COLUMN public.functions_master.active IS 'Inactive functions are hidden from selection but assignments are preserved';
COMMENT ON COLUMN public.user_functions.valid_from IS 'Optional: Date from which this function assignment is valid';
COMMENT ON COLUMN public.user_functions.valid_until IS 'Optional: Date until which this function assignment is valid';

COMMENT ON FUNCTION public.user_has_function(UUID, TEXT) IS 'Check if user has a specific function by code';
COMMENT ON FUNCTION public.user_has_any_function(UUID, TEXT[]) IS 'Check if user has any of the specified functions';
COMMENT ON FUNCTION public.get_users_by_function(TEXT[]) IS 'Get all users with specific function codes';
