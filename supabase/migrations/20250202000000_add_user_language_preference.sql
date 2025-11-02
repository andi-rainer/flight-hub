-- Add language preference to users table

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'de' CHECK (preferred_language IN ('de', 'en'));

COMMENT ON COLUMN public.users.preferred_language IS 'User''s preferred language (de=German, en=English)';
