-- Allow multiple account transactions per flight for split charging
-- This migration removes the unique constraint on accounts.flightlog_id
-- The constraint was originally added to mirror cost_center_transactions behavior,
-- but for split charging we need to allow multiple user charges for the same flight.

-- Drop the unique constraint
ALTER TABLE public.accounts
DROP CONSTRAINT IF EXISTS unique_flightlog_account;

-- The flightlog_id column and its index remain for tracking and performance
-- Index idx_accounts_flightlog_id is still useful for queries

-- Add comment explaining the design decision
COMMENT ON COLUMN public.accounts.flightlog_id IS
  'References the flight being charged. Multiple account transactions can reference the same flight for split charging.';
