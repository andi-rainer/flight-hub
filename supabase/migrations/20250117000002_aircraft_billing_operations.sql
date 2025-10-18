-- Migration: Aircraft Billing & Operation Types System
-- Remove yearly rates from functions and create flexible per-aircraft billing with operation types

-- ============================================================================
-- 1. Remove yearly_rate from functions_master
-- ============================================================================

ALTER TABLE public.functions_master
    DROP COLUMN IF EXISTS yearly_rate;

-- ============================================================================
-- 2. Add billing configuration to planes table
-- ============================================================================

ALTER TABLE public.planes
    ADD COLUMN IF NOT EXISTS billing_unit VARCHAR(10) DEFAULT 'hour' CHECK (billing_unit IN ('hour', 'minute')),
    ADD COLUMN IF NOT EXISTS default_rate DECIMAL(10,2) DEFAULT 150.00;

COMMENT ON COLUMN public.planes.billing_unit IS 'Billing unit: hour or minute';
COMMENT ON COLUMN public.planes.default_rate IS 'Default billing rate per unit';

-- ============================================================================
-- 3. Create operation_types table for aircraft-specific operation types
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.operation_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plane_id UUID NOT NULL REFERENCES public.planes(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    rate DECIMAL(10,2) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    color VARCHAR(7), -- Hex color code for UI
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_plane_operation_name UNIQUE (plane_id, name)
);

COMMENT ON TABLE public.operation_types IS 'Operation types for aircraft billing (e.g., Normal, Skydive Ops, Aerobatic)';
COMMENT ON COLUMN public.operation_types.rate IS 'Billing rate for this operation type (per billing_unit defined in planes table)';
COMMENT ON COLUMN public.operation_types.is_default IS 'Whether this is the default operation type for this aircraft';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_operation_types_plane_id ON public.operation_types(plane_id);
CREATE INDEX IF NOT EXISTS idx_operation_types_is_default ON public.operation_types(plane_id, is_default);

-- Add trigger to update updated_at
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

-- Ensure only one default per aircraft
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

-- ============================================================================
-- 4. Add operation_type to flightlog
-- ============================================================================

ALTER TABLE public.flightlog
    ADD COLUMN IF NOT EXISTS operation_type_id UUID REFERENCES public.operation_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_flightlog_operation_type_id ON public.flightlog(operation_type_id);

COMMENT ON COLUMN public.flightlog.operation_type_id IS 'Type of operation for billing purposes';

-- ============================================================================
-- 5. Add RLS policies for operation_types
-- ============================================================================

ALTER TABLE public.operation_types ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view operation types
CREATE POLICY "All users can view operation types"
    ON public.operation_types
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Board members can manage operation types
CREATE POLICY "Board members can manage operation types"
    ON public.operation_types
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND 'board' = ANY(users.role)
        )
    );

-- ============================================================================
-- 6. Create view for flightlog with operation type details
-- ============================================================================

CREATE OR REPLACE VIEW public.flightlog_with_operation_details AS
SELECT
    f.*,
    ot.name as operation_type_name,
    ot.rate as operation_rate,
    p.billing_unit as billing_unit,
    -- Calculate block time hours
    EXTRACT(EPOCH FROM (f.block_on - f.block_off)) / 3600.0 as block_time_hours,
    -- Calculate flight time hours
    EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 3600.0 as flight_time_hours,
    -- Calculate block time minutes
    EXTRACT(EPOCH FROM (f.block_on - f.block_off)) / 60.0 as block_time_minutes,
    -- Calculate flight time minutes
    EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 60.0 as flight_time_minutes,
    -- Calculate billing amount based on billing unit
    CASE
        WHEN p.billing_unit = 'minute' THEN
            (EXTRACT(EPOCH FROM (f.block_on - f.block_off)) / 60.0) * COALESCE(ot.rate, p.default_rate)
        ELSE
            (EXTRACT(EPOCH FROM (f.block_on - f.block_off)) / 3600.0) * COALESCE(ot.rate, p.default_rate)
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

COMMENT ON VIEW public.flightlog_with_operation_details IS 'Flightlog entries with calculated times, operation details, and billing amounts';

-- Grant permissions
GRANT SELECT ON public.flightlog_with_operation_details TO authenticated;

-- ============================================================================
-- 7. Insert default operation types for existing aircraft
-- ============================================================================

-- For each existing active aircraft, create a default "Normal Operations" type
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

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operation_types TO authenticated;

-- ============================================================================
-- 8. Update flightlog_with_times view to be compatible
-- ============================================================================

-- Drop the old view and recreate it with operation type support
DROP VIEW IF EXISTS public.flightlog_with_times;

CREATE VIEW public.flightlog_with_times AS
SELECT
    f.id,
    f.plane_id,
    f.pilot_id,
    f.copilot_id,
    f.block_on,
    f.block_off,
    f.takeoff_time,
    f.landing_time,
    f.fuel,
    f.oil,
    f.m_and_b_pdf_url,
    f.locked,
    f.charged,
    f.operation_type_id,
    f.created_at,
    f.updated_at,
    EXTRACT(EPOCH FROM (f.block_on - f.block_off)) / 3600.0 as block_time_hours,
    EXTRACT(EPOCH FROM (f.landing_time - f.takeoff_time)) / 3600.0 as flight_time_hours,
    p.tail_number,
    p.type as plane_type,
    pilot.name as pilot_name,
    pilot.surname as pilot_surname,
    copilot.name as copilot_name,
    copilot.surname as copilot_surname,
    ot.name as operation_type_name,
    ot.rate as operation_rate,
    p.billing_unit
FROM public.flightlog f
JOIN public.planes p ON f.plane_id = p.id
JOIN public.users pilot ON f.pilot_id = pilot.id
LEFT JOIN public.users copilot ON f.copilot_id = copilot.id
LEFT JOIN public.operation_types ot ON f.operation_type_id = ot.id;

GRANT SELECT ON public.flightlog_with_times TO authenticated;
