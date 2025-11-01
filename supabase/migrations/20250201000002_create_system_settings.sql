-- Create system settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES public.users(id)
);

-- Insert default tandem registration setting
INSERT INTO public.system_settings (key, value, description)
VALUES (
    'tandem_registration_membership_type',
    'null'::jsonb,
    'Membership type to assign to tandem registration sign-ups'
) ON CONFLICT (key) DO NOTHING;

-- Add index
CREATE INDEX idx_system_settings_key ON public.system_settings(key);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Board members can view all settings
CREATE POLICY "Board members can view settings"
    ON public.system_settings
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND 'board' = ANY(users.role)
        )
    );

-- Board members can update settings
CREATE POLICY "Board members can update settings"
    ON public.system_settings
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND 'board' = ANY(users.role)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND 'board' = ANY(users.role)
        )
    );

-- Add comment
COMMENT ON TABLE public.system_settings IS 'System-wide configuration settings';
