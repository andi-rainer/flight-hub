-- Add RLS policy to allow Secretary function to view all user memberships
-- This allows users with the Secretary function to manage member information

-- Create a helper function to check if user has Secretary function
CREATE OR REPLACE FUNCTION has_secretary_function(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_functions uf
    JOIN functions_master fm ON uf.function_id = fm.id
    WHERE uf.user_id = user_id
      AND fm.code = 'secretary'
      AND fm.active = true
      AND (uf.valid_until IS NULL OR uf.valid_until >= CURRENT_DATE)
  );
$$;

-- Add policy for Secretary to view all user memberships
CREATE POLICY "Secretary can view all user memberships"
  ON user_memberships
  FOR SELECT
  TO authenticated
  USING (has_secretary_function(auth.uid()));

-- Grant execute permission on the new function
GRANT EXECUTE ON FUNCTION has_secretary_function(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION has_secretary_function IS 'Check if a user has the active Secretary function';
COMMENT ON POLICY "Secretary can view all user memberships" ON user_memberships IS 'Allows users with Secretary function to view all member membership records';
