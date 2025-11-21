-- Add RLS policy to allow Secretary function to view all user function assignments
-- This allows users with the Secretary function to see which functions are assigned to members

-- Update the existing SELECT policy to include Secretary
DROP POLICY IF EXISTS "Users can view own function assignments" ON user_functions;

CREATE POLICY "Users can view function assignments"
  ON user_functions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_board_member(auth.uid())
    OR has_secretary_function(auth.uid())
  );

-- Add comment
COMMENT ON POLICY "Users can view function assignments" ON user_functions IS 'Users can view their own function assignments, and Secretary/Board can view all';
