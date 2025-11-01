-- Add additional tandem registration settings

-- Password protection for the form
INSERT INTO public.system_settings (key, value, description)
VALUES (
    'tandem_registration_password',
    '""'::jsonb,
    'Password required to access the tandem registration form'
) ON CONFLICT (key) DO NOTHING;

-- Custom fields for the registration form
INSERT INTO public.system_settings (key, value, description)
VALUES (
    'tandem_registration_custom_fields',
    '[]'::jsonb,
    'Custom text fields and checkboxes for the tandem registration form'
) ON CONFLICT (key) DO NOTHING;

-- Create storage bucket for T&C documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('tandem-documents', 'tandem-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for tandem documents
CREATE POLICY "Public can view tandem documents"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'tandem-documents');

CREATE POLICY "Board members can upload tandem documents"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'tandem-documents' AND
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND 'board' = ANY(users.role)
        )
    );

CREATE POLICY "Board members can delete tandem documents"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'tandem-documents' AND
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND 'board' = ANY(users.role)
        )
    );
