-- =====================================================
-- BILLING & COST CENTER SYSTEM
-- =====================================================
-- This migration creates the complete billing infrastructure including:
-- - Operation types (per-aircraft billing rates)
-- - Cost centers (internal cost tracking)
-- - Cost center transactions
-- - Uncharged flights view with calculations
--
-- Consolidated from:
-- - 20250117000002_aircraft_billing_operations.sql
-- - 20250123000006_create_billing_system.sql
-- - 20250123000008_add_transaction_reversal_tracking.sql
-- - 20250123000009_fix_reversal_foreign_key_constraints.sql
-- - 20250123000011_make_flightlog_id_nullable.sql
-- - 20250123000012_add_flightlog_id_to_accounts.sql
-- - 20250123000014_allow_multiple_accounts_per_flight.sql
-- - 20250131000002_add_inserted_at_to_cost_center_transactions.sql
--
-- =====================================================
-- 1. OPERATION TYPES
-- =====================================================
-- Operation types define billing rates per aircraft (e.g., Normal, Skydive Ops, Training)

CREATE TABLE IF NOT EXISTS public.operation_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plane_id UUID NOT NULL REFERENCES public.planes(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    rate NUMERIC(10,2) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    color VARCHAR(7), -- Hex color code for UI
    default_cost_center_id UUID, -- Added later, FK constraint added after cost_centers table
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_plane_operation_name UNIQUE (plane_id, name)
);

CREATE INDEX idx_operation_types_plane_id ON public.operation_types(plane_id);
CREATE INDEX idx_operation_types_is_default ON public.operation_types(plane_id, is_default);

COMMENT ON TABLE public.operation_types IS 'Operation types for aircraft billing (e.g., Normal, Skydive Ops, Aerobatic)';
COMMENT ON COLUMN public.operation_types.rate IS 'Billing rate for this operation type (per billing_unit defined in planes table)';
COMMENT ON COLUMN public.operation_types.is_default IS 'Whether this is the default operation type for this aircraft';
COMMENT ON COLUMN public.operation_types.default_cost_center_id IS 'Default cost center for this operation type (optional)';

-- Add foreign key for operation_type_id to flightlog (column already exists from initial schema)
-- This ensures referential integrity
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'flightlog_operation_type_id_fkey'
    ) THEN
        ALTER TABLE public.flightlog
        ADD CONSTRAINT flightlog_operation_type_id_fkey
        FOREIGN KEY (operation_type_id)
        REFERENCES public.operation_types(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- =====================================================
-- 2. COST CENTERS
-- =====================================================
-- Cost centers allow tracking internal costs without charging user accounts

CREATE TABLE IF NOT EXISTS public.cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cost_centers_active ON public.cost_centers(active);

COMMENT ON TABLE public.cost_centers IS 'Internal cost centers for tracking non-user expenses (e.g., club operations, maintenance flights)';
COMMENT ON COLUMN public.cost_centers.name IS 'Unique name for the cost center';
COMMENT ON COLUMN public.cost_centers.active IS 'Whether the cost center is currently active and can be used';

-- Now add the foreign key constraint to operation_types
ALTER TABLE public.operation_types
ADD CONSTRAINT operation_types_default_cost_center_id_fkey
FOREIGN KEY (default_cost_center_id)
REFERENCES public.cost_centers(id)
ON DELETE SET NULL;

CREATE INDEX idx_operation_types_default_cost_center_id ON public.operation_types(default_cost_center_id);

-- =====================================================
-- 3. COST CENTER TRANSACTIONS
-- =====================================================
-- Tracks flights charged to cost centers instead of user accounts

CREATE TABLE IF NOT EXISTS public.cost_center_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cost_center_id UUID NOT NULL REFERENCES public.cost_centers(id) ON DELETE RESTRICT,
    flightlog_id UUID REFERENCES public.flightlog(id) ON DELETE RESTRICT, -- Nullable to allow non-flight charges
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT NOT NULL,

    -- Audit trail
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Reversal tracking
    reversed_at TIMESTAMPTZ,
    reversed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reversal_transaction_id UUID REFERENCES public.cost_center_transactions(id) ON DELETE SET NULL,
    reverses_transaction_id UUID REFERENCES public.cost_center_transactions(id) ON DELETE SET NULL
);

CREATE INDEX idx_cost_center_transactions_cost_center_id ON public.cost_center_transactions(cost_center_id);
CREATE INDEX idx_cost_center_transactions_flightlog_id ON public.cost_center_transactions(flightlog_id);
CREATE INDEX idx_cost_center_transactions_created_by ON public.cost_center_transactions(created_by);
CREATE INDEX idx_cost_center_transactions_created_at ON public.cost_center_transactions(created_at);
CREATE INDEX idx_cost_center_transactions_inserted_at ON public.cost_center_transactions(inserted_at);
CREATE INDEX idx_cost_center_transactions_reversed_at ON public.cost_center_transactions(reversed_at) WHERE reversed_at IS NOT NULL;

COMMENT ON TABLE public.cost_center_transactions IS 'Transactions for flights charged to cost centers rather than user accounts';
COMMENT ON COLUMN public.cost_center_transactions.flightlog_id IS 'The flight that was charged (optional - can be standalone charge)';
COMMENT ON COLUMN public.cost_center_transactions.amount IS 'Amount charged to the cost center';
COMMENT ON COLUMN public.cost_center_transactions.created_by IS 'Board member who created this charge';
COMMENT ON COLUMN public.cost_center_transactions.inserted_at IS 'Timestamp when the transaction record was inserted into the database (immutable)';
COMMENT ON COLUMN public.cost_center_transactions.created_at IS 'Transaction date that can be set by the user';

-- =====================================================
-- 4. TRIGGERS
-- =====================================================

-- Trigger to update updated_at for operation_types
CREATE OR REPLACE FUNCTION public.update_operation_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_operation_types_updated_at
    BEFORE UPDATE ON public.operation_types
    FOR EACH ROW
    EXECUTE FUNCTION public.update_operation_types_updated_at();

-- Trigger to ensure only one default per aircraft
CREATE OR REPLACE FUNCTION public.ensure_single_default_operation_type()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE public.operation_types
        SET is_default = false
        WHERE plane_id = NEW.plane_id
          AND id != NEW.id
          AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_default_operation_type
    BEFORE INSERT OR UPDATE ON public.operation_types
    FOR EACH ROW
    WHEN (NEW.is_default = true)
    EXECUTE FUNCTION public.ensure_single_default_operation_type();

-- Trigger to update updated_at for cost_centers
CREATE TRIGGER update_cost_centers_updated_at
    BEFORE UPDATE ON public.cost_centers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 5. VIEWS
-- =====================================================

-- Flightlog with operation details
CREATE OR REPLACE VIEW public.flightlog_with_operation_details AS
SELECT
    f.*,
    ot.name as operation_type_name,
    ot.color as operation_type_color,
    ot.rate as operation_rate,
    ot.default_cost_center_id,
    p.billing_unit as billing_unit,
    -- Calculate block time hours
    public.calculate_block_time(f.block_off, f.block_on) as block_time_hours,
    -- Calculate flight time hours
    public.calculate_flight_time(f.takeoff_time, f.landing_time) as flight_time_hours,
    -- Calculate block time minutes
    EXTRACT(EPOCH FROM (f.block_on - f.block_off)) / 60.0 as block_time_minutes,
    -- Calculate flight time minutes
    EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 60.0 as flight_time_minutes,
    -- Calculate billing amount based on billing unit (uses FLIGHT TIME, not block time)
    CASE
        WHEN p.billing_unit = 'minute' THEN
            (EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 60.0) * COALESCE(ot.rate, p.default_rate, 0)
        ELSE
            (EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 3600.0) * COALESCE(ot.rate, p.default_rate, 0)
    END as calculated_billing_amount,
    p.tail_number,
    p.type as plane_type,
    pilot.name as pilot_name,
    pilot.surname as pilot_surname,
    copilot.name as copilot_name,
    copilot.surname as copilot_surname
FROM public.flightlog f
LEFT JOIN public.operation_types ot ON f.operation_type_id = ot.id
JOIN public.planes p ON f.plane_id = p.id
JOIN public.users pilot ON f.pilot_id = pilot.id
LEFT JOIN public.users copilot ON f.copilot_id = copilot.id;

COMMENT ON VIEW public.flightlog_with_operation_details IS 'Flightlog entries with calculated times, operation details, and billing amounts using FLIGHT TIME (not block time)';

-- Uncharged flights view for billing page
-- NOTE: This is the basic version - updated in airport_fees migration with fee calculations
CREATE OR REPLACE VIEW public.uncharged_flights AS
SELECT
    f.id,
    f.plane_id,
    f.pilot_id,
    f.copilot_id,
    f.operation_type_id,
    f.block_off,
    f.block_on,
    f.takeoff_time,
    f.landing_time,
    f.fuel,
    f.oil,
    f.landings,
    f.m_and_b_pdf_url,
    f.locked,
    f.charged,
    f.needs_board_review,
    f.created_at,
    f.icao_departure,
    f.icao_destination,
    f.passengers,
    -- Aircraft info
    p.tail_number,
    p.type AS plane_type,
    p.billing_unit,
    p.default_rate AS plane_default_rate,
    -- Pilot info
    pilot.name AS pilot_name,
    pilot.surname AS pilot_surname,
    pilot.email AS pilot_email,
    -- Copilot info
    copilot.name AS copilot_name,
    copilot.surname AS copilot_surname,
    -- Operation type info
    ot.name AS operation_type_name,
    ot.color AS operation_type_color,
    ot.rate AS operation_rate,
    ot.default_cost_center_id,
    cc.name AS default_cost_center_name,
    -- Time calculations
    public.calculate_block_time(f.block_off, f.block_on) AS block_time_hours,
    public.calculate_flight_time(f.takeoff_time, f.landing_time) AS flight_time_hours,
    -- Amount calculation based on billing unit and rate
    -- IMPORTANT: Uses FLIGHT TIME (landing_time - takeoff_time) NOT block time
    CASE
        WHEN p.billing_unit = 'minute' THEN
            COALESCE(
                (EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 60.0) * COALESCE(ot.rate, p.default_rate, 0),
                0
            )
        ELSE
            COALESCE(
                (EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 3600.0) * COALESCE(ot.rate, p.default_rate, 0),
                0
            )
    END AS calculated_amount
FROM public.flightlog f
JOIN public.planes p ON f.plane_id = p.id
JOIN public.users pilot ON f.pilot_id = pilot.id
LEFT JOIN public.users copilot ON f.copilot_id = copilot.id
LEFT JOIN public.operation_types ot ON f.operation_type_id = ot.id
LEFT JOIN public.cost_centers cc ON ot.default_cost_center_id = cc.id
WHERE f.charged = false AND f.locked = false
ORDER BY f.block_off DESC;

COMMENT ON VIEW public.uncharged_flights IS 'All uncharged and unlocked flights with calculated billing amounts using FLIGHT TIME (not block time)';

-- =====================================================
-- 6. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.operation_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_center_transactions ENABLE ROW LEVEL SECURITY;

-- Operation Types Policies
CREATE POLICY "All users can view operation types"
    ON public.operation_types FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Board members can manage operation types"
    ON public.operation_types FOR ALL
    TO authenticated
    USING (public.is_board_member(auth.uid()))
    WITH CHECK (public.is_board_member(auth.uid()));

-- Cost Centers Policies
CREATE POLICY "Cost centers viewable by authenticated users"
    ON public.cost_centers FOR SELECT
    TO authenticated
    USING (active = true OR public.is_board_member(auth.uid()));

CREATE POLICY "Board can manage cost centers"
    ON public.cost_centers FOR ALL
    TO authenticated
    USING (public.is_board_member(auth.uid()))
    WITH CHECK (public.is_board_member(auth.uid()));

-- Cost Center Transactions Policies
CREATE POLICY "Board can view cost center transactions"
    ON public.cost_center_transactions FOR SELECT
    TO authenticated
    USING (public.is_board_member(auth.uid()));

CREATE POLICY "Board can create cost center transactions"
    ON public.cost_center_transactions FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_board_member(auth.uid())
        AND created_by = auth.uid()
    );

CREATE POLICY "Board can update cost center transactions"
    ON public.cost_center_transactions FOR UPDATE
    TO authenticated
    USING (public.is_board_member(auth.uid()))
    WITH CHECK (public.is_board_member(auth.uid()));

CREATE POLICY "Board can delete cost center transactions"
    ON public.cost_center_transactions FOR DELETE
    TO authenticated
    USING (public.is_board_member(auth.uid()));

-- =====================================================
-- 7. SEED DATA
-- =====================================================

-- Create default operation types for existing aircraft
INSERT INTO public.operation_types (plane_id, name, description, rate, is_default, color)
SELECT
    id,
    'Normal Operations',
    'Standard flight operations',
    COALESCE(default_rate, 150.00),
    true,
    '#3b82f6' -- Blue color
FROM public.planes
WHERE active = true
ON CONFLICT (plane_id, name) DO NOTHING;

-- Create common cost centers
INSERT INTO public.cost_centers (name, description, active) VALUES
    ('Skydive Operations', 'Costs related to skydiving operations', true),
    ('Maintenance Flights', 'Test and maintenance flights', true)
ON CONFLICT (name) DO NOTHING;
