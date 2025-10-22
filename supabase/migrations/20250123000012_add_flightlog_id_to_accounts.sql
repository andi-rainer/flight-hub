-- =============================================
-- Add flightlog_id to accounts table
-- =============================================
-- This allows user account transactions to reference the flight they're charging
-- (similar to cost_center_transactions)

ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS flightlog_id UUID REFERENCES public.flightlog(id) ON DELETE RESTRICT;

COMMENT ON COLUMN public.accounts.flightlog_id IS 'The flight that was charged (optional - NULL for manual transactions)';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_accounts_flightlog_id
ON public.accounts(flightlog_id);

-- Add unique constraint to ensure one transaction per flight (like cost centers)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_flightlog_account'
  ) THEN
    ALTER TABLE public.accounts
    ADD CONSTRAINT unique_flightlog_account UNIQUE (flightlog_id);
  END IF;
END $$;
