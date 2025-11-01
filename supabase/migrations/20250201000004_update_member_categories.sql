-- Update member categories to only 'regular' and 'short-term'

-- First, update any existing membership types with 'trial' or 'premium' to 'short-term'
UPDATE public.membership_types
SET member_category = 'short-term'
WHERE member_category IN ('trial', 'premium');

-- Drop the old check constraint
ALTER TABLE public.membership_types
DROP CONSTRAINT IF EXISTS membership_types_member_category_check;

-- Add new check constraint with only 'regular' and 'short-term'
ALTER TABLE public.membership_types
ADD CONSTRAINT membership_types_member_category_check
CHECK (member_category IN ('regular', 'short-term'));

-- Update any users with old categories to 'short-term'
UPDATE public.users
SET member_category = 'short-term'
WHERE member_category IN ('trial', 'premium');
