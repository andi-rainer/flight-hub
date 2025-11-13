-- Add cost splitting configuration for operation types
-- Allows operation types to define default split targets (cost centers and/or pilot)

-- Create table for operation type split targets
CREATE TABLE public.operation_type_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type_id UUID NOT NULL REFERENCES public.operation_types(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('cost_center', 'pilot')),
  cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE CASCADE,
  percentage NUMERIC(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraint: cost_center_id must be set if target_type is 'cost_center'
  CONSTRAINT cost_center_required CHECK (
    (target_type = 'cost_center' AND cost_center_id IS NOT NULL) OR
    (target_type = 'pilot' AND cost_center_id IS NULL)
  )
);

-- Create index for faster lookups
CREATE INDEX idx_operation_type_splits_operation_type ON public.operation_type_splits(operation_type_id);

-- Add RLS policies
ALTER TABLE public.operation_type_splits ENABLE ROW LEVEL SECURITY;

-- All members can view split configurations
CREATE POLICY "Members can view operation type splits"
  ON public.operation_type_splits
  FOR SELECT
  TO authenticated
  USING (true);

-- Only board members can create/update/delete split configurations
CREATE POLICY "Board members can manage operation type splits"
  ON public.operation_type_splits
  FOR ALL
  TO authenticated
  USING (public.is_board_member(auth.uid()))
  WITH CHECK (public.is_board_member(auth.uid()));

-- Add function to validate split percentages sum to 100
CREATE OR REPLACE FUNCTION public.validate_operation_type_splits()
RETURNS TRIGGER AS $$
DECLARE
  total_percentage NUMERIC(5,2);
BEGIN
  -- Calculate total percentage for this operation type
  SELECT COALESCE(SUM(percentage), 0)
  INTO total_percentage
  FROM public.operation_type_splits
  WHERE operation_type_id = COALESCE(NEW.operation_type_id, OLD.operation_type_id);

  -- Allow if total is 0 (no splits) or 100 (valid split)
  IF total_percentage <> 0 AND total_percentage <> 100 THEN
    RAISE EXCEPTION 'Split percentages must sum to 100%% (currently %.2f%%)', total_percentage;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to validate percentages
CREATE TRIGGER validate_operation_type_splits_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.operation_type_splits
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_operation_type_splits();

-- Add comment
COMMENT ON TABLE public.operation_type_splits IS 'Defines default cost split targets for operation types. Allows automatic splitting between cost centers and/or pilot. Percentages must sum to 100.';
COMMENT ON COLUMN public.operation_type_splits.target_type IS 'Type of target: cost_center (specific cost center) or pilot (flight pilot)';
COMMENT ON COLUMN public.operation_type_splits.percentage IS 'Percentage of cost allocated to this target (must sum to 100 across all targets for an operation type)';
COMMENT ON COLUMN public.operation_type_splits.sort_order IS 'Display order for split targets';

-- Migration note: This adds cost splitting configuration to operation types
-- Existing operation_types.default_cost_center_id remains for backward compatibility
-- If an operation type has splits configured, those take precedence over default_cost_center_id
