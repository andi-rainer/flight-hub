-- Create materialized view for efficient user searches with functions
-- Note: Renamed to avoid conflict with existing users_with_functions view
CREATE MATERIALIZED VIEW IF NOT EXISTS public.users_with_functions_search AS
SELECT
  u.id,
  u.name,
  u.surname,
  u.email,
  u.role,
  m.start_date as membership_start_date,
  m.end_date as membership_end_date,
  mt.member_category as membership_category,
  m.status as membership_status,
  COALESCE(ARRAY_AGG(fm.code) FILTER (WHERE fm.code IS NOT NULL), ARRAY[]::TEXT[]) as function_codes,
  COALESCE(ARRAY_AGG(fm.name) FILTER (WHERE fm.name IS NOT NULL), ARRAY[]::TEXT[]) as function_names,
  COALESCE(STRING_AGG(fm.name, ', ') FILTER (WHERE fm.name IS NOT NULL), '') as functions_display,
  COALESCE(ARRAY_AGG(fc.code) FILTER (WHERE fc.code IS NOT NULL), ARRAY[]::TEXT[]) as category_codes
FROM public.users u
LEFT JOIN public.user_memberships m ON u.id = m.user_id AND m.status = 'active'
LEFT JOIN public.membership_types mt ON m.membership_type_id = mt.id
LEFT JOIN public.user_functions uf ON u.id = uf.user_id
LEFT JOIN public.functions_master fm ON uf.function_id = fm.id AND fm.active = TRUE
LEFT JOIN public.function_categories fc ON fm.category_id = fc.id
GROUP BY u.id, u.name, u.surname, u.email, u.role,
         m.start_date, m.end_date, mt.member_category, m.status;

-- Create unique index required for CONCURRENT refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_functions_search_id ON public.users_with_functions_search(id);

-- Create indexes on materialized view for fast searches
CREATE INDEX IF NOT EXISTS idx_users_functions_search_codes ON public.users_with_functions_search USING gin(function_codes);
CREATE INDEX IF NOT EXISTS idx_users_functions_search_name ON public.users_with_functions_search(name, surname);
CREATE INDEX IF NOT EXISTS idx_users_functions_search_membership_status ON public.users_with_functions_search(membership_status);
CREATE INDEX IF NOT EXISTS idx_users_functions_search_membership_date ON public.users_with_functions_search(membership_start_date);
CREATE INDEX IF NOT EXISTS idx_users_functions_search_category ON public.users_with_functions_search USING gin(category_codes);

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION public.refresh_users_with_functions_search()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.users_with_functions_search;
END;
$$;

-- Create trigger function to auto-refresh on user/function changes
CREATE OR REPLACE FUNCTION public.trigger_refresh_users_search()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Schedule refresh (non-blocking)
  PERFORM public.refresh_users_with_functions_search();
  RETURN NULL;
END;
$$;

-- Add triggers to refresh materialized view
DROP TRIGGER IF EXISTS trigger_refresh_users_search_on_user_change ON public.users;
CREATE TRIGGER trigger_refresh_users_search_on_user_change
AFTER INSERT OR UPDATE OR DELETE ON public.users
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_refresh_users_search();

DROP TRIGGER IF EXISTS trigger_refresh_users_search_on_function_change ON public.user_functions;
CREATE TRIGGER trigger_refresh_users_search_on_function_change
AFTER INSERT OR UPDATE OR DELETE ON public.user_functions
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_refresh_users_search();

-- Initial refresh
SELECT public.refresh_users_with_functions_search();

-- Create table for tracking recent user selections (for autocomplete)
CREATE TABLE IF NOT EXISTS public.user_recent_selections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  selected_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  context TEXT NOT NULL, -- 'flight_crew', 'tandem_master', 'tandem_guest', etc.
  selected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, selected_user_id, context)
);

-- Index for fast recent selections lookup
CREATE INDEX IF NOT EXISTS idx_recent_selections_lookup
ON public.user_recent_selections(user_id, context, selected_at DESC);

-- Function to track a selection
CREATE OR REPLACE FUNCTION public.track_user_selection(
  p_user_id UUID,
  p_selected_user_id UUID,
  p_context TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_recent_selections (user_id, selected_user_id, context)
  VALUES (p_user_id, p_selected_user_id, p_context)
  ON CONFLICT (user_id, selected_user_id, context)
  DO UPDATE SET selected_at = NOW();

  -- Keep only last 10 selections per user per context
  DELETE FROM public.user_recent_selections
  WHERE id IN (
    SELECT id FROM public.user_recent_selections
    WHERE user_id = p_user_id AND context = p_context
    ORDER BY selected_at DESC
    OFFSET 10
  );
END;
$$;

-- Function to get recent selections
CREATE OR REPLACE FUNCTION public.get_recent_selections(
  p_user_id UUID,
  p_context TEXT,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  surname TEXT,
  email TEXT,
  functions_display TEXT,
  function_codes TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    uwf.id,
    uwf.name,
    uwf.surname,
    uwf.email,
    uwf.functions_display,
    uwf.function_codes
  FROM public.user_recent_selections urs
  JOIN public.users_with_functions_search uwf ON urs.selected_user_id = uwf.id
  WHERE urs.user_id = p_user_id
    AND urs.context = p_context
    AND uwf.membership_status IN ('active', 'pending')
  ORDER BY urs.selected_at DESC
  LIMIT p_limit;
END;
$$;

-- Comments
COMMENT ON MATERIALIZED VIEW public.users_with_functions_search IS 'Materialized view combining users with their functions for efficient searching';
COMMENT ON TABLE public.user_recent_selections IS 'Tracks recently selected users for autocomplete suggestions';
COMMENT ON FUNCTION public.track_user_selection IS 'Records a user selection and maintains a limited history';
COMMENT ON FUNCTION public.get_recent_selections IS 'Retrieves recent user selections for a specific context';
