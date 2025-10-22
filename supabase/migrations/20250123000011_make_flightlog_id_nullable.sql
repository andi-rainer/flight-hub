-- =============================================
-- Make flightlog_id nullable in cost_center_transactions
-- =============================================
-- This allows cost centers to have manual transactions not linked to flights
-- (e.g., ticket sales, refunds, other expenses)

ALTER TABLE public.cost_center_transactions
ALTER COLUMN flightlog_id DROP NOT NULL;

COMMENT ON COLUMN public.cost_center_transactions.flightlog_id IS 'The flight that was charged (optional - NULL for manual transactions)';
