-- =====================================================
-- MAINTENANCE & COMPONENT TRACKING SYSTEM
-- =====================================================
-- This migration creates the maintenance tracking and component TBO system
--
-- Consolidated from:
-- - 20250130000000_create_maintenance_system.sql
-- - 20250130000001_add_color_to_maintenance_view.sql
-- - 20250131000003_create_aircraft_components_system.sql
-- - 20250131000004_create_component_tbo_presets.sql
-- - 20250131000005_add_tach_hobbs_to_maintenance.sql
--
-- =====================================================
-- 1. MAINTENANCE RECORDS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.maintenance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plane_id UUID NOT NULL REFERENCES public.planes(id) ON DELETE CASCADE,

    -- When and where
    performed_at TIMESTAMPTZ NOT NULL,
    performed_at_hours NUMERIC(10, 2), -- Aircraft hours at time of maintenance
    tach_hours NUMERIC(10, 2), -- Tachometer hours
    hobbs_hours NUMERIC(10, 2), -- Hobbs meter hours
    performed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,

    -- What was done
    maintenance_type TEXT NOT NULL CHECK (maintenance_type IN (
        'inspection', 'repair', 'modification', 'service', 'component_replacement', 'other'
    )),
    description TEXT NOT NULL,

    -- Next due
    next_due_hours NUMERIC(10, 2),

    -- Cost tracking
    cost NUMERIC(10, 2),
    vendor TEXT,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT maintenance_records_description_check CHECK (LENGTH(description) > 0)
);

CREATE INDEX idx_maintenance_records_plane_id ON public.maintenance_records(plane_id);
CREATE INDEX idx_maintenance_records_performed_at ON public.maintenance_records(performed_at DESC);
CREATE INDEX idx_maintenance_records_performed_by ON public.maintenance_records(performed_by);
CREATE INDEX idx_maintenance_records_maintenance_type ON public.maintenance_records(maintenance_type);
CREATE INDEX idx_maintenance_records_next_due_hours ON public.maintenance_records(next_due_hours) WHERE next_due_hours IS NOT NULL;

COMMENT ON TABLE public.maintenance_records IS 'Maintenance and service records for aircraft';
COMMENT ON COLUMN public.maintenance_records.performed_at_hours IS 'Total aircraft hours at time of maintenance';
COMMENT ON COLUMN public.maintenance_records.tach_hours IS 'Tachometer reading at time of maintenance';
COMMENT ON COLUMN public.maintenance_records.hobbs_hours IS 'Hobbs meter reading at time of maintenance';
COMMENT ON COLUMN public.maintenance_records.next_due_hours IS 'Aircraft hours when next maintenance is due';
COMMENT ON COLUMN public.maintenance_records.maintenance_type IS 'Type of maintenance: inspection, repair, modification, service, component_replacement, or other';

-- =====================================================
-- 2. AIRCRAFT COMPONENTS TABLE
-- =====================================================
-- Tracks life-limited and TBO components

CREATE TABLE IF NOT EXISTS public.aircraft_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plane_id UUID NOT NULL REFERENCES public.planes(id) ON DELETE CASCADE,

    -- Component identification
    component_type component_type NOT NULL,
    position TEXT, -- e.g., "Left", "Right", "Center", "1", "2", etc.
    serial_number TEXT,
    manufacturer TEXT,
    model TEXT,
    part_number TEXT,

    -- TBO tracking
    tbo_hours NUMERIC(10, 2) NOT NULL,
    hours_at_installation NUMERIC(10, 2) DEFAULT 0,
    component_hours_offset NUMERIC(10, 2) DEFAULT 0, -- For used components

    -- Installation
    installed_at TIMESTAMPTZ DEFAULT NOW(),
    installed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    installation_mx_record_id UUID REFERENCES public.maintenance_records(id) ON DELETE SET NULL,

    -- Status
    status component_status DEFAULT 'installed',

    -- Removal (if applicable)
    removed_at TIMESTAMPTZ,
    removed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    removal_reason TEXT,
    removal_mx_record_id UUID REFERENCES public.maintenance_records(id) ON DELETE SET NULL,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT aircraft_components_tbo_check CHECK (tbo_hours > 0)
);

CREATE INDEX idx_aircraft_components_plane_id ON public.aircraft_components(plane_id);
CREATE INDEX idx_aircraft_components_component_type ON public.aircraft_components(component_type);
CREATE INDEX idx_aircraft_components_status ON public.aircraft_components(status);
CREATE INDEX idx_aircraft_components_installation_mx_record_id ON public.aircraft_components(installation_mx_record_id);
CREATE INDEX idx_aircraft_components_removal_mx_record_id ON public.aircraft_components(removal_mx_record_id);

COMMENT ON TABLE public.aircraft_components IS 'Tracks life-limited and TBO components installed on aircraft';
COMMENT ON COLUMN public.aircraft_components.tbo_hours IS 'Time Between Overhaul in hours';
COMMENT ON COLUMN public.aircraft_components.hours_at_installation IS 'Aircraft total hours when component was installed';
COMMENT ON COLUMN public.aircraft_components.component_hours_offset IS 'Component hours already accumulated (for used/overhauled components)';
COMMENT ON COLUMN public.aircraft_components.status IS 'Current status: installed, removed, maintenance, or scrapped';

-- =====================================================
-- 3. COMPONENT TBO PRESETS TABLE
-- =====================================================
-- Default TBO values for common components

CREATE TABLE IF NOT EXISTS public.component_tbo_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_type component_type NOT NULL,
    manufacturer TEXT,
    model TEXT,
    part_number TEXT,
    default_tbo_hours NUMERIC(10, 2) NOT NULL,
    description TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT component_tbo_presets_tbo_check CHECK (default_tbo_hours > 0)
);

CREATE INDEX idx_component_tbo_presets_component_type ON public.component_tbo_presets(component_type);
CREATE INDEX idx_component_tbo_presets_manufacturer ON public.component_tbo_presets(manufacturer);
CREATE INDEX idx_component_tbo_presets_model ON public.component_tbo_presets(model);

COMMENT ON TABLE public.component_tbo_presets IS 'Default TBO values for common component types to assist with data entry';
COMMENT ON COLUMN public.component_tbo_presets.default_tbo_hours IS 'Manufacturer recommended TBO in hours';

-- =====================================================
-- 4. VIEWS
-- =====================================================

-- Aircraft with maintenance status
CREATE OR REPLACE VIEW public.aircraft_with_maintenance AS
SELECT
    p.*,
    totals.total_flight_hours,
    totals.total_landings,
    totals.last_flight_date,
    -- Next maintenance calculation
    CASE
        WHEN p.next_maintenance_hours IS NOT NULL THEN p.next_maintenance_hours
        WHEN p.maintenance_interval_hours IS NOT NULL THEN
            COALESCE(totals.total_flight_hours, 0) + p.maintenance_interval_hours
        ELSE NULL
    END AS calculated_next_maintenance_hours,
    -- Hours until next maintenance
    CASE
        WHEN p.next_maintenance_hours IS NOT NULL THEN
            p.next_maintenance_hours - COALESCE(totals.total_flight_hours, 0)
        WHEN p.maintenance_interval_hours IS NOT NULL THEN
            p.maintenance_interval_hours
        ELSE NULL
    END AS hours_until_maintenance,
    -- Status color for UI
    CASE
        WHEN p.next_maintenance_hours IS NOT NULL AND
             p.next_maintenance_hours - COALESCE(totals.total_flight_hours, 0) <= 0 THEN 'red'
        WHEN p.next_maintenance_hours IS NOT NULL AND
             p.next_maintenance_hours - COALESCE(totals.total_flight_hours, 0) <= 10 THEN 'orange'
        WHEN p.next_maintenance_hours IS NOT NULL AND
             p.next_maintenance_hours - COALESCE(totals.total_flight_hours, 0) <= 25 THEN 'yellow'
        ELSE 'green'
    END AS maintenance_status_color,
    -- Last maintenance
    last_mx.performed_at AS last_maintenance_date,
    last_mx.maintenance_type AS last_maintenance_type,
    last_mx.description AS last_maintenance_description
FROM public.planes p
LEFT JOIN public.aircraft_totals totals ON p.id = totals.id
LEFT JOIN LATERAL (
    SELECT performed_at, maintenance_type, description
    FROM public.maintenance_records
    WHERE plane_id = p.id
    ORDER BY performed_at DESC
    LIMIT 1
) last_mx ON true;

COMMENT ON VIEW public.aircraft_with_maintenance IS 'Aircraft with maintenance status, hours until next maintenance, and color coding';

-- Aircraft components with remaining hours
CREATE OR REPLACE VIEW public.aircraft_components_with_status AS
SELECT
    c.*,
    p.tail_number,
    totals.total_flight_hours AS aircraft_total_hours,
    -- Component hours calculation
    (totals.total_flight_hours - c.hours_at_installation + c.component_hours_offset) AS component_current_hours,
    -- Remaining hours
    (c.tbo_hours - (totals.total_flight_hours - c.hours_at_installation + c.component_hours_offset)) AS hours_remaining,
    -- Percentage remaining
    CASE
        WHEN c.tbo_hours > 0 THEN
            ((c.tbo_hours - (totals.total_flight_hours - c.hours_at_installation + c.component_hours_offset)) / c.tbo_hours * 100)
        ELSE 0
    END AS percent_remaining,
    -- Status color for UI
    CASE
        WHEN c.status != 'installed' THEN 'gray'
        WHEN (c.tbo_hours - (totals.total_flight_hours - c.hours_at_installation + c.component_hours_offset)) <= 0 THEN 'red'
        WHEN (c.tbo_hours - (totals.total_flight_hours - c.hours_at_installation + c.component_hours_offset)) <= 50 THEN 'orange'
        WHEN (c.tbo_hours - (totals.total_flight_hours - c.hours_at_installation + c.component_hours_offset)) <= 100 THEN 'yellow'
        ELSE 'green'
    END AS status_color
FROM public.aircraft_components c
JOIN public.planes p ON c.plane_id = p.id
LEFT JOIN public.aircraft_totals totals ON p.id = totals.id;

COMMENT ON VIEW public.aircraft_components_with_status IS 'Aircraft components with calculated hours, remaining TBO, and status colors';

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

CREATE TRIGGER update_maintenance_records_updated_at
    BEFORE UPDATE ON public.maintenance_records
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_aircraft_components_updated_at
    BEFORE UPDATE ON public.aircraft_components
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_component_tbo_presets_updated_at
    BEFORE UPDATE ON public.component_tbo_presets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 6. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aircraft_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.component_tbo_presets ENABLE ROW LEVEL SECURITY;

-- Maintenance Records: All authenticated users can read
CREATE POLICY "Maintenance records viewable by authenticated users"
    ON public.maintenance_records FOR SELECT
    TO authenticated
    USING (true);

-- Maintenance Records: Board can manage
CREATE POLICY "Board can manage maintenance records"
    ON public.maintenance_records FOR ALL
    TO authenticated
    USING (public.is_board_member(auth.uid()))
    WITH CHECK (public.is_board_member(auth.uid()));

-- Aircraft Components: All authenticated users can read
CREATE POLICY "Aircraft components viewable by authenticated users"
    ON public.aircraft_components FOR SELECT
    TO authenticated
    USING (true);

-- Aircraft Components: Board can manage
CREATE POLICY "Board can manage aircraft components"
    ON public.aircraft_components FOR ALL
    TO authenticated
    USING (public.is_board_member(auth.uid()))
    WITH CHECK (public.is_board_member(auth.uid()) AND created_by = auth.uid());

-- Component TBO Presets: All authenticated users can read
CREATE POLICY "Component TBO presets viewable by authenticated users"
    ON public.component_tbo_presets FOR SELECT
    TO authenticated
    USING (true);

-- Component TBO Presets: Board can manage
CREATE POLICY "Board can manage component TBO presets"
    ON public.component_tbo_presets FOR ALL
    TO authenticated
    USING (public.is_board_member(auth.uid()))
    WITH CHECK (public.is_board_member(auth.uid()));

-- =====================================================
-- 7. SEED DATA: COMMON TBO PRESETS
-- =====================================================

INSERT INTO public.component_tbo_presets (component_type, manufacturer, model, default_tbo_hours, description) VALUES
    ('engine', 'Lycoming', 'O-320', 2000, 'Lycoming O-320 series engine'),
    ('engine', 'Lycoming', 'O-360', 2000, 'Lycoming O-360 series engine'),
    ('engine', 'Lycoming', 'IO-360', 2000, 'Lycoming IO-360 series engine (fuel injected)'),
    ('engine', 'Continental', 'O-200', 1800, 'Continental O-200 series engine'),
    ('engine', 'Rotax', '912', 2000, 'Rotax 912 series engine'),
    ('engine', 'Rotax', '914', 2000, 'Rotax 914 series engine (turbocharged)'),
    ('propeller', 'McCauley', NULL, 2000, 'McCauley propellers (typical TBO)'),
    ('propeller', 'Sensenich', NULL, 2000, 'Sensenich propellers (typical TBO)'),
    ('propeller', 'Hartzell', NULL, 2000, 'Hartzell propellers (typical TBO)')
ON CONFLICT DO NOTHING;
