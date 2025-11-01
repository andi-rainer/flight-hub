-- Add emergency contact fields to users table

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;

COMMENT ON COLUMN public.users.emergency_contact_name IS 'Emergency contact person full name';
COMMENT ON COLUMN public.users.emergency_contact_phone IS 'Emergency contact person telephone number';
