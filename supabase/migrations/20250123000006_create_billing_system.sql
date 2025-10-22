-- =============================================
-- Billing System Migration
-- =============================================
-- This migration creates the infrastructure for the billing system:
-- 1. Cost centers for internal cost tracking
-- 2. Cost center transactions for flights charged to cost centers
-- 3. Audit columns for tracking who charged flights
-- 4. RLS policies for board-member-only access
-- 5. Views for uncharged flights with calculated amounts

-- =============================================
-- 1. CREATE COST CENTERS TABLE
-- =============================================
-- Cost centers allow tracking internal costs (e.g., "Skydive Ops", "Maintenance")
-- instead of charging flights directly to user accounts

CREATE TABLE IF NOT EXISTS public.cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.cost_centers IS 'Internal cost centers for tracking non-user expenses (e.g., club operations, maintenance flights)';
COMMENT ON COLUMN public.cost_centers.name IS 'Unique name for the cost center';
COMMENT ON COLUMN public.cost_centers.active IS 'Whether the cost center is currently active and can be used';

-- =============================================
-- 2. CREATE COST CENTER TRANSACTIONS TABLE
-- =============================================
-- Tracks flights charged to cost centers instead of user accounts

CREATE TABLE IF NOT EXISTS public.cost_center_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cost_center_id UUID NOT NULL REFERENCES public.cost_centers(id) ON DELETE RESTRICT,
    flightlog_id UUID NOT NULL REFERENCES public.flightlog(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_flightlog_cost_center UNIQUE (flightlog_id)
);

COMMENT ON TABLE public.cost_center_transactions IS 'Transactions for flights charged to cost centers rather than user accounts';
COMMENT ON COLUMN public.cost_center_transactions.flightlog_id IS 'The flight that was charged (one-to-one relationship)';
COMMENT ON COLUMN public.cost_center_transactions.amount IS 'Amount charged to the cost center';
COMMENT ON COLUMN public.cost_center_transactions.created_by IS 'Board member who created this charge';

-- =============================================
-- 3. ADD AUDIT COLUMNS TO FLIGHTLOG
-- =============================================
-- Track who charged a flight and when for audit trail

ALTER TABLE public.flightlog
ADD COLUMN IF NOT EXISTS charged_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS charged_at TIMESTAMPTZ;

COMMENT ON COLUMN public.flightlog.charged_by IS 'Board member who charged this flight';
COMMENT ON COLUMN public.flightlog.charged_at IS 'Timestamp when flight was charged';

-- =============================================
-- 4. ADD DEFAULT COST CENTER TO OPERATION TYPES
-- =============================================
-- Operation types can have a default cost center (e.g., "Skydive Ops" → "Skydive Cost Center")

ALTER TABLE public.operation_types
ADD COLUMN IF NOT EXISTS default_cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.operation_types.default_cost_center_id IS 'Default cost center for this operation type (optional)';

-- =============================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_cost_center_transactions_cost_center_id
ON public.cost_center_transactions(cost_center_id);

CREATE INDEX IF NOT EXISTS idx_cost_center_transactions_flightlog_id
ON public.cost_center_transactions(flightlog_id);

CREATE INDEX IF NOT EXISTS idx_cost_center_transactions_created_by
ON public.cost_center_transactions(created_by);

CREATE INDEX IF NOT EXISTS idx_flightlog_charged_by
ON public.flightlog(charged_by);

CREATE INDEX IF NOT EXISTS idx_flightlog_charged
ON public.flightlog(charged) WHERE charged = false;

CREATE INDEX IF NOT EXISTS idx_operation_types_default_cost_center_id
ON public.operation_types(default_cost_center_id);

-- =============================================
-- 6. ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_center_transactions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 7. CREATE RLS POLICIES
-- =============================================

-- Cost Centers: Read - all authenticated users can view active, board can view all
CREATE POLICY "Cost centers viewable by authenticated users"
ON public.cost_centers FOR SELECT
TO authenticated
USING (active = true OR public.is_board_member(auth.uid()));

-- Cost Centers: Manage - board only
CREATE POLICY "Board can manage cost centers"
ON public.cost_centers FOR INSERT
TO authenticated
WITH CHECK (public.is_board_member(auth.uid()));

CREATE POLICY "Board can update cost centers"
ON public.cost_centers FOR UPDATE
TO authenticated
USING (public.is_board_member(auth.uid()))
WITH CHECK (public.is_board_member(auth.uid()));

CREATE POLICY "Board can delete cost centers"
ON public.cost_centers FOR DELETE
TO authenticated
USING (public.is_board_member(auth.uid()));

-- Cost Center Transactions: Read - board only
CREATE POLICY "Board can view cost center transactions"
ON public.cost_center_transactions FOR SELECT
TO authenticated
USING (public.is_board_member(auth.uid()));

-- Cost Center Transactions: Insert - board only (with created_by check)
CREATE POLICY "Board can create cost center transactions"
ON public.cost_center_transactions FOR INSERT
TO authenticated
WITH CHECK (
    public.is_board_member(auth.uid())
    AND created_by = auth.uid()
);

-- Cost Center Transactions: Update - board only
CREATE POLICY "Board can update cost center transactions"
ON public.cost_center_transactions FOR UPDATE
TO authenticated
USING (public.is_board_member(auth.uid()))
WITH CHECK (public.is_board_member(auth.uid()));

-- Cost Center Transactions: Delete - board only
CREATE POLICY "Board can delete cost center transactions"
ON public.cost_center_transactions FOR DELETE
TO authenticated
USING (public.is_board_member(auth.uid()));

-- =============================================
-- 8. CREATE UNCHARGED FLIGHTS VIEW
-- =============================================
-- View combining all uncharged flights with calculated amounts for easy billing

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
    f.created_at,
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
    ot.rate AS operation_rate,
    ot.default_cost_center_id,
    cc.name AS default_cost_center_name,
    -- Time calculations
    EXTRACT(EPOCH FROM (f.block_on - f.block_off)) / 3600.0 AS block_time_hours,
    EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 3600.0 AS flight_time_hours,
    -- Amount calculation based on billing unit and rate
    CASE
        WHEN p.billing_unit = 'minute' THEN
            (EXTRACT(EPOCH FROM (f.block_on - f.block_off)) / 60.0) * COALESCE(ot.rate, p.default_rate, 0)
        ELSE
            (EXTRACT(EPOCH FROM (f.block_on - f.block_off)) / 3600.0) * COALESCE(ot.rate, p.default_rate, 0)
    END AS calculated_amount
FROM public.flightlog f
JOIN public.planes p ON f.plane_id = p.id
JOIN public.users pilot ON f.pilot_id = pilot.id
LEFT JOIN public.users copilot ON f.copilot_id = copilot.id
LEFT JOIN public.operation_types ot ON f.operation_type_id = ot.id
LEFT JOIN public.cost_centers cc ON ot.default_cost_center_id = cc.id
WHERE f.charged = false AND f.locked = true
ORDER BY f.block_off DESC;

COMMENT ON VIEW public.uncharged_flights IS 'All uncharged and locked flights with calculated billing amounts, ready for charging';

-- Grant SELECT on view to authenticated users (board member check in RLS)
GRANT SELECT ON public.uncharged_flights TO authenticated;

-- =============================================
-- 9. CREATE FUNCTION TO UPDATE UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to cost_centers
CREATE TRIGGER update_cost_centers_updated_at
    BEFORE UPDATE ON public.cost_centers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
