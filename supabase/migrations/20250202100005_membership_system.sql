-- =====================================================
-- MEMBERSHIP & SYSTEM SETTINGS
-- =====================================================
-- This migration creates the membership management system and system settings
--
-- Consolidated from:
-- - 20250131000008_create_membership_system.sql
-- - 20250201000001_create_payment_status_history.sql
-- - 20250201000002_create_system_settings.sql
-- - 20250201000003_add_tandem_settings.sql
-- - 20250201000004_update_member_categories.sql
--
-- =====================================================
-- 1. MEMBERSHIP TYPES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.membership_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    duration_value INTEGER NOT NULL,
    duration_unit TEXT NOT NULL CHECK (duration_unit IN ('days', 'months', 'years')),
    price NUMERIC(10,2) DEFAULT 0.00,
    currency TEXT DEFAULT 'EUR',
    auto_renew BOOLEAN DEFAULT false,
    member_category TEXT CHECK (member_category IN ('regular', 'short-term')),
    member_number_prefix TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_membership_types_active ON public.membership_types(active);
CREATE INDEX idx_membership_types_member_category ON public.membership_types(member_category);

COMMENT ON TABLE public.membership_types IS 'Defines different types of memberships available';
COMMENT ON COLUMN public.membership_types.name IS 'Display name of membership type';
COMMENT ON COLUMN public.membership_types.description IS 'Description of what this membership includes';
COMMENT ON COLUMN public.membership_types.duration_value IS 'Numeric value for duration (e.g., 1, 7, 30, 365)';
COMMENT ON COLUMN public.membership_types.duration_unit IS 'Unit of time: days, months, or years';
COMMENT ON COLUMN public.membership_types.price IS 'Cost of membership';
COMMENT ON COLUMN public.membership_types.member_category IS 'Category of member: regular or short-term';
COMMENT ON COLUMN public.membership_types.member_number_prefix IS 'Prefix for member numbers (e.g., M, T, S)';

-- =====================================================
-- 2. USER MEMBERSHIPS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    membership_type_id UUID NOT NULL REFERENCES public.membership_types(id),
    member_number TEXT UNIQUE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    auto_renew BOOLEAN DEFAULT false,
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid', 'pending')),
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_memberships_user_id ON public.user_memberships(user_id);
CREATE INDEX idx_user_memberships_status ON public.user_memberships(status);
CREATE INDEX idx_user_memberships_end_date ON public.user_memberships(end_date);
CREATE INDEX idx_user_memberships_member_number ON public.user_memberships(member_number);
CREATE INDEX idx_user_memberships_payment_status ON public.user_memberships(payment_status);

COMMENT ON TABLE public.user_memberships IS 'Tracks all membership assignments and history (7-year retention)';
COMMENT ON COLUMN public.user_memberships.member_number IS 'Unique member number with prefix (e.g., M-2025-001)';
COMMENT ON COLUMN public.user_memberships.status IS 'Current status of this membership';
COMMENT ON COLUMN public.user_memberships.payment_status IS 'Payment status for this membership';
COMMENT ON COLUMN public.user_memberships.notes IS 'Additional notes about this membership';

-- =====================================================
-- 3. PAYMENT STATUS HISTORY
-- =====================================================
-- Tracks all payment status changes for audit trail

CREATE TABLE IF NOT EXISTS public.payment_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID NOT NULL REFERENCES public.user_memberships(id) ON DELETE CASCADE,
    old_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    changed_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,

    CONSTRAINT payment_status_history_status_check CHECK (
        old_status IN ('paid', 'unpaid', 'pending') AND
        new_status IN ('paid', 'unpaid', 'pending')
    )
);

CREATE INDEX idx_payment_status_history_membership_id ON public.payment_status_history(membership_id);
CREATE INDEX idx_payment_status_history_changed_at ON public.payment_status_history(changed_at DESC);

COMMENT ON TABLE public.payment_status_history IS 'Audit trail of payment status changes for memberships';

-- =====================================================
-- 4. TERMS AND CONDITIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.terms_and_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    effective_date DATE NOT NULL,
    active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_terms_and_conditions_active ON public.terms_and_conditions(active);
CREATE INDEX idx_terms_and_conditions_effective_date ON public.terms_and_conditions(effective_date);

COMMENT ON TABLE public.terms_and_conditions IS 'Stores different versions of terms and conditions';
COMMENT ON COLUMN public.terms_and_conditions.version IS 'Version identifier (e.g., "1.0", "2.0")';
COMMENT ON COLUMN public.terms_and_conditions.content IS 'Full text of terms and conditions';
COMMENT ON COLUMN public.terms_and_conditions.effective_date IS 'Date when this version becomes effective';
COMMENT ON COLUMN public.terms_and_conditions.active IS 'Whether this is the currently active version';

-- =====================================================
-- 5. USER TERMS ACCEPTANCE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_terms_acceptance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    terms_id UUID NOT NULL REFERENCES public.terms_and_conditions(id),
    accepted_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT,

    CONSTRAINT user_terms_acceptance_unique UNIQUE(user_id, terms_id)
);

CREATE INDEX idx_user_terms_acceptance_user_id ON public.user_terms_acceptance(user_id);
CREATE INDEX idx_user_terms_acceptance_terms_id ON public.user_terms_acceptance(terms_id);

COMMENT ON TABLE public.user_terms_acceptance IS 'Tracks which users have accepted which terms versions';
COMMENT ON COLUMN public.user_terms_acceptance.ip_address IS 'IP address from which terms were accepted';

-- =====================================================
-- 6. SYSTEM SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES public.users(id)
);

CREATE INDEX idx_system_settings_key ON public.system_settings(key);

COMMENT ON TABLE public.system_settings IS 'System-wide configuration settings stored as JSONB';

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

CREATE TRIGGER update_membership_types_updated_at
    BEFORE UPDATE ON public.membership_types
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_memberships_updated_at
    BEFORE UPDATE ON public.user_memberships
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to record payment status changes
CREATE OR REPLACE FUNCTION public.record_payment_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.payment_status != NEW.payment_status THEN
        INSERT INTO public.payment_status_history (
            membership_id,
            old_status,
            new_status,
            changed_by,
            changed_at
        ) VALUES (
            NEW.id,
            OLD.payment_status,
            NEW.payment_status,
            auth.uid(),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_record_payment_status_change
    AFTER UPDATE ON public.user_memberships
    FOR EACH ROW
    WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
    EXECUTE FUNCTION public.record_payment_status_change();

-- =====================================================
-- 8. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.membership_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms_and_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_terms_acceptance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Membership Types Policies
CREATE POLICY "Board members can manage membership types"
    ON public.membership_types FOR ALL
    TO authenticated
    USING (public.is_board_member(auth.uid()))
    WITH CHECK (public.is_board_member(auth.uid()));

CREATE POLICY "Everyone can view active membership types"
    ON public.membership_types FOR SELECT
    TO authenticated
    USING (active = true);

-- User Memberships Policies
CREATE POLICY "Board members can manage all memberships"
    ON public.user_memberships FOR ALL
    TO authenticated
    USING (public.is_board_member(auth.uid()))
    WITH CHECK (public.is_board_member(auth.uid()));

CREATE POLICY "Users can view their own memberships"
    ON public.user_memberships FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Payment Status History Policies
CREATE POLICY "Board members can view payment history"
    ON public.payment_status_history FOR SELECT
    TO authenticated
    USING (public.is_board_member(auth.uid()));

-- Terms and Conditions Policies
CREATE POLICY "Board members can manage terms and conditions"
    ON public.terms_and_conditions FOR ALL
    TO authenticated
    USING (public.is_board_member(auth.uid()))
    WITH CHECK (public.is_board_member(auth.uid()));

CREATE POLICY "Everyone can view active terms"
    ON public.terms_and_conditions FOR SELECT
    TO authenticated
    USING (active = true);

-- User Terms Acceptance Policies
CREATE POLICY "Users can record their own terms acceptance"
    ON public.user_terms_acceptance FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Board members can view all terms acceptances"
    ON public.user_terms_acceptance FOR SELECT
    TO authenticated
    USING (public.is_board_member(auth.uid()));

CREATE POLICY "Users can view their own terms acceptances"
    ON public.user_terms_acceptance FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- System Settings Policies
CREATE POLICY "Board members can view settings"
    ON public.system_settings FOR SELECT
    TO authenticated
    USING (public.is_board_member(auth.uid()));

CREATE POLICY "Board members can update settings"
    ON public.system_settings FOR UPDATE
    TO authenticated
    USING (public.is_board_member(auth.uid()))
    WITH CHECK (public.is_board_member(auth.uid()));

-- =====================================================
-- 9. SEED DATA: DEFAULT SETTINGS
-- =====================================================

INSERT INTO public.system_settings (key, value, description) VALUES
    ('tandem_registration_membership_type', 'null'::jsonb, 'Membership type to assign to tandem registration sign-ups'),
    ('tandem_registration_password', '""'::jsonb, 'Password required to access the tandem registration form'),
    ('tandem_registration_custom_fields', '[]'::jsonb, 'Custom text fields and checkboxes for the tandem registration form')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 10. SEED DATA: SAMPLE MEMBERSHIP TYPES
-- =====================================================

INSERT INTO public.membership_types (name, description, duration_value, duration_unit, price, member_category, member_number_prefix, active) VALUES
    ('Regular Membership', 'Full year membership with all benefits', 1, 'years', 500.00, 'regular', 'M', true)
ON CONFLICT DO NOTHING;
