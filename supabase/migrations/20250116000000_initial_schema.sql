-- FlightHub Initial Schema Migration
-- This migration creates the complete database schema for the aviation club management application

-- =====================================================
-- EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================
CREATE TYPE reservation_status AS ENUM ('active', 'standby', 'cancelled');

-- =====================================================
-- TABLES
-- =====================================================

-- Users table (extends auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    surname TEXT NOT NULL,
    role TEXT[] NOT NULL DEFAULT ARRAY['member']::TEXT[],
    license_number TEXT,
    functions TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_role_check CHECK (role <@ ARRAY['member', 'board']::TEXT[])
);

-- Indexes for users
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users USING GIN(role);

-- Functions master table (defines available club functions/roles)
CREATE TABLE public.functions_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    yearly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT functions_master_name_check CHECK (LENGTH(name) > 0),
    CONSTRAINT functions_master_yearly_rate_check CHECK (yearly_rate >= 0)
);

-- Planes table
CREATE TABLE public.planes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tail_number TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    empty_weight NUMERIC(8, 2),
    max_fuel NUMERIC(8, 2),
    fuel_consumption NUMERIC(6, 2),
    color TEXT,
    nav_equipment TEXT[] DEFAULT ARRAY[]::TEXT[],
    xdpr_equipment TEXT,
    emer_equipment TEXT,
    max_mass NUMERIC(8, 2),
    cg_limits JSONB,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT planes_tail_number_check CHECK (LENGTH(tail_number) > 0),
    CONSTRAINT planes_type_check CHECK (LENGTH(type) > 0),
    CONSTRAINT planes_empty_weight_check CHECK (empty_weight IS NULL OR empty_weight > 0),
    CONSTRAINT planes_max_fuel_check CHECK (max_fuel IS NULL OR max_fuel > 0),
    CONSTRAINT planes_fuel_consumption_check CHECK (fuel_consumption IS NULL OR fuel_consumption > 0),
    CONSTRAINT planes_max_mass_check CHECK (max_mass IS NULL OR max_mass > 0)
);

-- Indexes for planes
CREATE INDEX idx_planes_tail_number ON public.planes(tail_number);
CREATE INDEX idx_planes_active ON public.planes(active);

-- Reservations table
CREATE TABLE public.reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plane_id UUID NOT NULL REFERENCES public.planes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status reservation_status NOT NULL DEFAULT 'active',
    priority BOOLEAN NOT NULL DEFAULT FALSE,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT reservations_time_check CHECK (end_time > start_time),
    CONSTRAINT reservations_future_check CHECK (start_time >= created_at)
);

-- Indexes for reservations
CREATE INDEX idx_reservations_plane_id ON public.reservations(plane_id);
CREATE INDEX idx_reservations_user_id ON public.reservations(user_id);
CREATE INDEX idx_reservations_start_time ON public.reservations(start_time);
CREATE INDEX idx_reservations_end_time ON public.reservations(end_time);
CREATE INDEX idx_reservations_status ON public.reservations(status);
CREATE INDEX idx_reservations_time_range ON public.reservations(start_time, end_time);

-- Flightlog table
CREATE TABLE public.flightlog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plane_id UUID NOT NULL REFERENCES public.planes(id) ON DELETE RESTRICT,
    pilot_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    copilot_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    block_on TIMESTAMPTZ NOT NULL,
    block_off TIMESTAMPTZ NOT NULL,
    takeoff_time TIMESTAMPTZ NOT NULL,
    landing_time TIMESTAMPTZ NOT NULL,
    fuel NUMERIC(8, 2),
    oil NUMERIC(6, 2),
    m_and_b_pdf_url TEXT,
    locked BOOLEAN NOT NULL DEFAULT FALSE,
    charged BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT flightlog_block_time_check CHECK (block_off > block_on),
    CONSTRAINT flightlog_flight_time_check CHECK (landing_time > takeoff_time),
    CONSTRAINT flightlog_takeoff_after_block_on CHECK (takeoff_time >= block_on),
    CONSTRAINT flightlog_landing_before_block_off CHECK (landing_time <= block_off),
    CONSTRAINT flightlog_fuel_check CHECK (fuel IS NULL OR fuel >= 0),
    CONSTRAINT flightlog_oil_check CHECK (oil IS NULL OR oil >= 0),
    CONSTRAINT flightlog_pilot_copilot_check CHECK (pilot_id != copilot_id),
    CONSTRAINT flightlog_charged_requires_locked CHECK (NOT charged OR locked)
);

-- Indexes for flightlog
CREATE INDEX idx_flightlog_plane_id ON public.flightlog(plane_id);
CREATE INDEX idx_flightlog_pilot_id ON public.flightlog(pilot_id);
CREATE INDEX idx_flightlog_copilot_id ON public.flightlog(copilot_id);
CREATE INDEX idx_flightlog_block_on ON public.flightlog(block_on);
CREATE INDEX idx_flightlog_locked ON public.flightlog(locked);
CREATE INDEX idx_flightlog_charged ON public.flightlog(charged);

-- Documents table
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plane_id UUID REFERENCES public.planes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    category TEXT,
    name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expiry_date DATE,
    approved BOOLEAN NOT NULL DEFAULT FALSE,
    blocks_aircraft BOOLEAN NOT NULL DEFAULT FALSE,

    -- Constraints
    CONSTRAINT documents_name_check CHECK (LENGTH(name) > 0),
    CONSTRAINT documents_file_url_check CHECK (LENGTH(file_url) > 0),
    CONSTRAINT documents_entity_check CHECK (
        (plane_id IS NOT NULL AND user_id IS NULL AND category IS NULL) OR
        (plane_id IS NULL AND user_id IS NOT NULL AND category IS NULL) OR
        (plane_id IS NULL AND user_id IS NULL AND category IS NOT NULL)
    ),
    CONSTRAINT documents_blocks_aircraft_check CHECK (
        NOT blocks_aircraft OR plane_id IS NOT NULL
    )
);

-- Indexes for documents
CREATE INDEX idx_documents_plane_id ON public.documents(plane_id);
CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_documents_category ON public.documents(category);
CREATE INDEX idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX idx_documents_expiry_date ON public.documents(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_documents_approved ON public.documents(approved);
CREATE INDEX idx_documents_blocks_aircraft ON public.documents(blocks_aircraft) WHERE blocks_aircraft = TRUE;
CREATE INDEX idx_documents_tags ON public.documents USING GIN(tags);

-- Accounts table (financial transactions)
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT accounts_description_check CHECK (LENGTH(description) > 0)
);

-- Indexes for accounts
CREATE INDEX idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX idx_accounts_created_by ON public.accounts(created_by);
CREATE INDEX idx_accounts_created_at ON public.accounts(created_at);

-- Notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT notifications_type_check CHECK (LENGTH(type) > 0),
    CONSTRAINT notifications_message_check CHECK (LENGTH(message) > 0)
);

-- Indexes for notifications
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = FALSE;

-- =====================================================
-- FUNCTIONS AND VIEWS
-- =====================================================

-- Function to check if user is board member
CREATE OR REPLACE FUNCTION public.is_board_member(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = user_uuid AND 'board' = ANY(role)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to calculate block time in hours
CREATE OR REPLACE FUNCTION public.calculate_block_time(
    p_block_on TIMESTAMPTZ,
    p_block_off TIMESTAMPTZ
)
RETURNS NUMERIC AS $$
BEGIN
    RETURN EXTRACT(EPOCH FROM (p_block_off - p_block_on)) / 3600.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate flight time in hours
CREATE OR REPLACE FUNCTION public.calculate_flight_time(
    p_takeoff_time TIMESTAMPTZ,
    p_landing_time TIMESTAMPTZ
)
RETURNS NUMERIC AS $$
BEGIN
    RETURN EXTRACT(EPOCH FROM (p_landing_time - p_takeoff_time)) / 3600.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- View for flightlog with calculated times
CREATE OR REPLACE VIEW public.flightlog_with_times AS
SELECT
    f.*,
    public.calculate_block_time(f.block_on, f.block_off) AS block_time_hours,
    public.calculate_flight_time(f.takeoff_time, f.landing_time) AS flight_time_hours,
    p.tail_number,
    p.type AS plane_type,
    pilot.name AS pilot_name,
    pilot.surname AS pilot_surname,
    copilot.name AS copilot_name,
    copilot.surname AS copilot_surname
FROM public.flightlog f
JOIN public.planes p ON f.plane_id = p.id
JOIN public.users pilot ON f.pilot_id = pilot.id
LEFT JOIN public.users copilot ON f.copilot_id = copilot.id;

-- View for active reservations with user and plane details
CREATE OR REPLACE VIEW public.active_reservations AS
SELECT
    r.*,
    p.tail_number,
    p.type AS plane_type,
    p.color AS plane_color,
    u.name AS user_name,
    u.surname AS user_surname,
    u.email AS user_email,
    EXTRACT(EPOCH FROM (r.end_time - r.start_time)) / 3600.0 AS duration_hours
FROM public.reservations r
JOIN public.planes p ON r.plane_id = p.id
JOIN public.users u ON r.user_id = u.id
WHERE r.status = 'active' AND r.end_time > NOW();

-- View for user account balances
CREATE OR REPLACE VIEW public.user_balances AS
SELECT
    u.id AS user_id,
    u.email,
    u.name,
    u.surname,
    COALESCE(SUM(a.amount), 0) AS balance,
    COUNT(a.id) AS transaction_count
FROM public.users u
LEFT JOIN public.accounts a ON u.id = a.user_id
GROUP BY u.id, u.email, u.name, u.surname;

-- Function to check if aircraft can be reserved (no blocking expired documents)
CREATE OR REPLACE FUNCTION public.can_reserve_aircraft(p_plane_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM public.documents
        WHERE plane_id = p_plane_id
        AND blocks_aircraft = TRUE
        AND expiry_date IS NOT NULL
        AND expiry_date < CURRENT_DATE
        AND approved = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_planes_updated_at BEFORE UPDATE ON public.planes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON public.reservations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_flightlog_updated_at BEFORE UPDATE ON public.flightlog
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to prevent modification of locked flightlog entries
CREATE OR REPLACE FUNCTION public.prevent_locked_flightlog_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.locked = TRUE AND (
        NEW.block_on != OLD.block_on OR
        NEW.block_off != OLD.block_off OR
        NEW.takeoff_time != OLD.takeoff_time OR
        NEW.landing_time != OLD.landing_time OR
        NEW.fuel != OLD.fuel OR
        NEW.oil != OLD.oil OR
        NEW.plane_id != OLD.plane_id OR
        NEW.pilot_id != OLD.pilot_id OR
        COALESCE(NEW.copilot_id::TEXT, '') != COALESCE(OLD.copilot_id::TEXT, '')
    ) THEN
        RAISE EXCEPTION 'Cannot modify locked flightlog entry. Only locked and charged flags can be updated.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_locked_flightlog_modification BEFORE UPDATE ON public.flightlog
    FOR EACH ROW EXECUTE FUNCTION public.prevent_locked_flightlog_modification();

-- Trigger to auto-create user entry when auth.users is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, surname, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'surname', ''),
        ARRAY['member']::TEXT[]
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.functions_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flightlog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: USERS
-- =====================================================

-- Users: Read - all authenticated users can read all user profiles
CREATE POLICY "Users are viewable by authenticated users"
    ON public.users FOR SELECT
    TO authenticated
    USING (true);

-- Users: Update - users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users: Update - board members can update any user profile
CREATE POLICY "Board can update any user profile"
    ON public.users FOR UPDATE
    TO authenticated
    USING (public.is_board_member(auth.uid()))
    WITH CHECK (public.is_board_member(auth.uid()));

-- Users: Insert - handled by trigger, but allow board to create
CREATE POLICY "Board can insert users"
    ON public.users FOR INSERT
    TO authenticated
    WITH CHECK (public.is_board_member(auth.uid()));

-- =====================================================
-- RLS POLICIES: FUNCTIONS_MASTER
-- =====================================================

-- Functions Master: Read - all authenticated users can read
CREATE POLICY "Functions master readable by authenticated users"
    ON public.functions_master FOR SELECT
    TO authenticated
    USING (true);

-- Functions Master: Insert/Update/Delete - only board members
CREATE POLICY "Board can manage functions master"
    ON public.functions_master FOR ALL
    TO authenticated
    USING (public.is_board_member(auth.uid()))
    WITH CHECK (public.is_board_member(auth.uid()));

-- =====================================================
-- RLS POLICIES: PLANES
-- =====================================================

-- Planes: Read - all authenticated users can read all planes
CREATE POLICY "Planes are viewable by authenticated users"
    ON public.planes FOR SELECT
    TO authenticated
    USING (true);

-- Planes: Insert/Update/Delete - only board members
CREATE POLICY "Board can manage planes"
    ON public.planes FOR ALL
    TO authenticated
    USING (public.is_board_member(auth.uid()))
    WITH CHECK (public.is_board_member(auth.uid()));

-- =====================================================
-- RLS POLICIES: RESERVATIONS
-- =====================================================

-- Reservations: Read - all authenticated users can read all reservations
CREATE POLICY "Reservations are viewable by authenticated users"
    ON public.reservations FOR SELECT
    TO authenticated
    USING (true);

-- Reservations: Insert - authenticated users can create reservations
CREATE POLICY "Authenticated users can create reservations"
    ON public.reservations FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Reservations: Update - users can update their own active reservations
CREATE POLICY "Users can update own reservations"
    ON public.reservations FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id AND status = 'active')
    WITH CHECK (auth.uid() = user_id);

-- Reservations: Update - board can update any reservation
CREATE POLICY "Board can update any reservation"
    ON public.reservations FOR UPDATE
    TO authenticated
    USING (public.is_board_member(auth.uid()))
    WITH CHECK (public.is_board_member(auth.uid()));

-- Reservations: Delete - users can delete their own reservations
CREATE POLICY "Users can delete own reservations"
    ON public.reservations FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Reservations: Delete - board can delete any reservation
CREATE POLICY "Board can delete any reservation"
    ON public.reservations FOR DELETE
    TO authenticated
    USING (public.is_board_member(auth.uid()));

-- =====================================================
-- RLS POLICIES: FLIGHTLOG
-- =====================================================

-- Flightlog: Read - all authenticated users can read all entries
CREATE POLICY "Flightlog viewable by authenticated users"
    ON public.flightlog FOR SELECT
    TO authenticated
    USING (true);

-- Flightlog: Insert - authenticated users can create entries for themselves as pilot
CREATE POLICY "Users can create own flightlog entries"
    ON public.flightlog FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = pilot_id);

-- Flightlog: Update - users can update their own unlocked entries
CREATE POLICY "Users can update own unlocked flightlog"
    ON public.flightlog FOR UPDATE
    TO authenticated
    USING (auth.uid() = pilot_id AND locked = false)
    WITH CHECK (auth.uid() = pilot_id);

-- Flightlog: Update - board can update locked/charged flags
CREATE POLICY "Board can lock and charge flightlog entries"
    ON public.flightlog FOR UPDATE
    TO authenticated
    USING (public.is_board_member(auth.uid()))
    WITH CHECK (public.is_board_member(auth.uid()));

-- Flightlog: Delete - board can delete entries
CREATE POLICY "Board can delete flightlog entries"
    ON public.flightlog FOR DELETE
    TO authenticated
    USING (public.is_board_member(auth.uid()));

-- =====================================================
-- RLS POLICIES: DOCUMENTS
-- =====================================================

-- Documents: Read - all authenticated users can read approved documents
CREATE POLICY "Approved documents viewable by authenticated users"
    ON public.documents FOR SELECT
    TO authenticated
    USING (approved = true);

-- Documents: Read - users can see their own documents even if not approved
CREATE POLICY "Users can view own documents"
    ON public.documents FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR uploaded_by = auth.uid());

-- Documents: Read - board can see all documents
CREATE POLICY "Board can view all documents"
    ON public.documents FOR SELECT
    TO authenticated
    USING (public.is_board_member(auth.uid()));

-- Documents: Insert - authenticated users can upload documents
CREATE POLICY "Users can upload documents"
    ON public.documents FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = uploaded_by AND (
            user_id = auth.uid() OR
            user_id IS NULL
        )
    );

-- Documents: Update - board can approve and manage documents
CREATE POLICY "Board can manage documents"
    ON public.documents FOR UPDATE
    TO authenticated
    USING (public.is_board_member(auth.uid()))
    WITH CHECK (public.is_board_member(auth.uid()));

-- Documents: Delete - uploaders can delete their own unapproved documents
CREATE POLICY "Users can delete own unapproved documents"
    ON public.documents FOR DELETE
    TO authenticated
    USING (uploaded_by = auth.uid() AND approved = false);

-- Documents: Delete - board can delete any document
CREATE POLICY "Board can delete any document"
    ON public.documents FOR DELETE
    TO authenticated
    USING (public.is_board_member(auth.uid()));

-- =====================================================
-- RLS POLICIES: ACCOUNTS
-- =====================================================

-- Accounts: Read - users can read their own account transactions
CREATE POLICY "Users can view own account transactions"
    ON public.accounts FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Accounts: Read - board can read all account transactions
CREATE POLICY "Board can view all account transactions"
    ON public.accounts FOR SELECT
    TO authenticated
    USING (public.is_board_member(auth.uid()));

-- Accounts: Insert - only board can create account transactions
CREATE POLICY "Board can create account transactions"
    ON public.accounts FOR INSERT
    TO authenticated
    WITH CHECK (public.is_board_member(auth.uid()) AND created_by = auth.uid());

-- Accounts: Update/Delete - only board can modify transactions
CREATE POLICY "Board can manage account transactions"
    ON public.accounts FOR ALL
    TO authenticated
    USING (public.is_board_member(auth.uid()))
    WITH CHECK (public.is_board_member(auth.uid()));

-- =====================================================
-- RLS POLICIES: NOTIFICATIONS
-- =====================================================

-- Notifications: Read - users can read their own notifications
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Notifications: Update - users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Notifications: Insert - board can create notifications for any user
CREATE POLICY "Board can create notifications"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (public.is_board_member(auth.uid()));

-- Notifications: Delete - users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
    ON public.notifications FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- =====================================================
-- COMMENTS (Documentation)
-- =====================================================

COMMENT ON TABLE public.users IS 'Extends auth.users with aviation club specific profile information';
COMMENT ON TABLE public.planes IS 'Aircraft fleet information and specifications';
COMMENT ON TABLE public.reservations IS 'Flight reservations/bookings for aircraft';
COMMENT ON TABLE public.flightlog IS 'Flight log entries tracking actual flights';
COMMENT ON TABLE public.documents IS 'Document management for users, aircraft, and general club documents';
COMMENT ON TABLE public.accounts IS 'Financial account transactions for members';
COMMENT ON TABLE public.functions_master IS 'Master list of club functions/roles with associated fees';
COMMENT ON TABLE public.notifications IS 'User notifications system';

COMMENT ON COLUMN public.documents.blocks_aircraft IS 'If true and document is expired, prevents aircraft reservation';
COMMENT ON COLUMN public.flightlog.locked IS 'Locked entries cannot be modified by pilots';
COMMENT ON COLUMN public.flightlog.charged IS 'Indicates if flight has been charged to user account';
COMMENT ON COLUMN public.reservations.priority IS 'Priority reservations (e.g., for instructors, maintenance)';
