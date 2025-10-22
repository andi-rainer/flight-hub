-- =============================================
-- Fix flightlog INSERT policy for new columns
-- =============================================
-- The original policy only checked pilot_id, but we added charged_by and charged_at
-- columns which need to be NULL for new flights

-- Drop the old policy
DROP POLICY IF EXISTS "Users can create own flightlog entries" ON public.flightlog;

-- Create new policy that ensures charged_by and charged_at are NULL for new flights
-- (only board members can set these via charging operations)
CREATE POLICY "Users can create own flightlog entries"
ON public.flightlog FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = pilot_id
  AND (charged_by IS NULL OR public.is_board_member(auth.uid()))
  AND (charged_at IS NULL OR public.is_board_member(auth.uid()))
);

COMMENT ON POLICY "Users can create own flightlog entries" ON public.flightlog IS
'Users can create flights where they are the pilot. Charged_by/charged_at must be NULL unless user is board member.';
