-- Update uncharged_flights view to indicate if operation type has cost splitting configured
-- This allows the billing UI to detect and apply default split configurations

-- Add helper function to check if operation type has splits configured
CREATE OR REPLACE FUNCTION public.has_operation_type_splits(op_type_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.operation_type_splits
    WHERE operation_type_id = op_type_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.has_operation_type_splits IS 'Returns true if the operation type has cost split targets configured';

-- Note: We don't need to recreate the uncharged_flights view since the charge dialog
-- will fetch split configurations separately when needed. This keeps the view simpler.
