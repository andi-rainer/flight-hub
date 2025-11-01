-- Create membership system tables

-- Add member_category to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS member_category TEXT;

COMMENT ON COLUMN public.users.member_category IS 'Member category: trial, short-term, regular, premium';

-- Create membership_types table
CREATE TABLE IF NOT EXISTS public.membership_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  duration_value INTEGER NOT NULL,
  duration_unit TEXT NOT NULL CHECK (duration_unit IN ('days', 'months', 'years')),
  price DECIMAL(10,2) DEFAULT 0.00,
  currency TEXT DEFAULT 'EUR',
  auto_renew BOOLEAN DEFAULT false,
  member_category TEXT CHECK (member_category IN ('trial', 'short-term', 'regular', 'premium')),
  member_number_prefix TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.membership_types IS 'Defines different types of memberships available';
COMMENT ON COLUMN public.membership_types.name IS 'Display name of membership type';
COMMENT ON COLUMN public.membership_types.description IS 'Description of what this membership includes';
COMMENT ON COLUMN public.membership_types.duration_value IS 'Numeric value for duration (e.g., 1, 7, 30, 365)';
COMMENT ON COLUMN public.membership_types.duration_unit IS 'Unit of time: days, months, or years';
COMMENT ON COLUMN public.membership_types.price IS 'Cost of membership';
COMMENT ON COLUMN public.membership_types.member_category IS 'Category of member this type grants';
COMMENT ON COLUMN public.membership_types.member_number_prefix IS 'Prefix for member numbers (e.g., T, M, TR, S)';

-- Create user_memberships table
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

COMMENT ON TABLE public.user_memberships IS 'Tracks all membership assignments and history (7-year retention)';
COMMENT ON COLUMN public.user_memberships.member_number IS 'Unique member number with prefix (e.g., T-2025-001)';
COMMENT ON COLUMN public.user_memberships.status IS 'Current status of this membership';
COMMENT ON COLUMN public.user_memberships.payment_status IS 'Payment status for this membership';
COMMENT ON COLUMN public.user_memberships.notes IS 'Additional notes about this membership';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_memberships_user_id ON public.user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_status ON public.user_memberships(status);
CREATE INDEX IF NOT EXISTS idx_user_memberships_end_date ON public.user_memberships(end_date);
CREATE INDEX IF NOT EXISTS idx_user_memberships_member_number ON public.user_memberships(member_number);

-- Create terms_and_conditions table
CREATE TABLE IF NOT EXISTS public.terms_and_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  effective_date DATE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.terms_and_conditions IS 'Stores different versions of terms and conditions';
COMMENT ON COLUMN public.terms_and_conditions.version IS 'Version identifier (e.g., "1.0", "2.0")';
COMMENT ON COLUMN public.terms_and_conditions.content IS 'Full text of terms and conditions';
COMMENT ON COLUMN public.terms_and_conditions.effective_date IS 'Date when this version becomes effective';
COMMENT ON COLUMN public.terms_and_conditions.active IS 'Whether this is the currently active version';

-- Create user_terms_acceptance table
CREATE TABLE IF NOT EXISTS public.user_terms_acceptance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  terms_id UUID NOT NULL REFERENCES public.terms_and_conditions(id),
  accepted_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  UNIQUE(user_id, terms_id)
);

COMMENT ON TABLE public.user_terms_acceptance IS 'Tracks which users have accepted which terms versions';
COMMENT ON COLUMN public.user_terms_acceptance.ip_address IS 'IP address from which terms were accepted';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_terms_acceptance_user_id ON public.user_terms_acceptance(user_id);

-- Enable RLS on new tables
ALTER TABLE public.membership_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms_and_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_terms_acceptance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for membership_types (board can manage, everyone can read active types)
CREATE POLICY "Board members can manage membership types"
  ON public.membership_types
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND 'board' = ANY(users.role)
    )
  );

CREATE POLICY "Everyone can view active membership types"
  ON public.membership_types
  FOR SELECT
  TO authenticated
  USING (active = true);

-- RLS Policies for user_memberships (board can manage, users can view their own)
CREATE POLICY "Board members can manage all memberships"
  ON public.user_memberships
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND 'board' = ANY(users.role)
    )
  );

CREATE POLICY "Users can view their own memberships"
  ON public.user_memberships
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for terms_and_conditions (board can manage, everyone can read active)
CREATE POLICY "Board members can manage terms and conditions"
  ON public.terms_and_conditions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND 'board' = ANY(users.role)
    )
  );

CREATE POLICY "Everyone can view active terms"
  ON public.terms_and_conditions
  FOR SELECT
  TO authenticated
  USING (active = true);

-- RLS Policies for user_terms_acceptance (users can insert their own, board can view all)
CREATE POLICY "Users can record their own terms acceptance"
  ON public.user_terms_acceptance
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Board members can view all terms acceptances"
  ON public.user_terms_acceptance
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND 'board' = ANY(users.role)
    )
  );

CREATE POLICY "Users can view their own terms acceptances"
  ON public.user_terms_acceptance
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
