-- Add additional profile fields to users table

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS house_number TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS zip TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS telephone TEXT,
ADD COLUMN IF NOT EXISTS joined_at DATE,
ADD COLUMN IF NOT EXISTS left_at DATE;

COMMENT ON COLUMN public.users.street IS 'Street name for user address';
COMMENT ON COLUMN public.users.house_number IS 'House/building number';
COMMENT ON COLUMN public.users.city IS 'City of residence';
COMMENT ON COLUMN public.users.zip IS 'ZIP/Postal code';
COMMENT ON COLUMN public.users.country IS 'Country of residence';
COMMENT ON COLUMN public.users.birthday IS 'Date of birth';
COMMENT ON COLUMN public.users.telephone IS 'Contact telephone number';
COMMENT ON COLUMN public.users.joined_at IS 'Date when user joined the club (editable by board only)';
COMMENT ON COLUMN public.users.left_at IS 'Date when user left the club (editable by board only)';
