-- Fix reversal tracking foreign key constraints with explicit names
-- This ensures PostgREST can find the relationships when querying

-- Drop existing foreign keys if they exist (they may have auto-generated names)
ALTER TABLE public.accounts
DROP CONSTRAINT IF EXISTS accounts_reversed_by_fkey,
DROP CONSTRAINT IF EXISTS accounts_reversal_transaction_id_fkey,
DROP CONSTRAINT IF EXISTS accounts_reverses_transaction_id_fkey;

ALTER TABLE public.cost_center_transactions
DROP CONSTRAINT IF EXISTS cost_center_transactions_reversed_by_fkey,
DROP CONSTRAINT IF EXISTS cost_center_transactions_reversal_transaction_id_fkey,
DROP CONSTRAINT IF EXISTS cost_center_transactions_reverses_transaction_id_fkey;

-- Add foreign key constraints with explicit names for accounts table
ALTER TABLE public.accounts
ADD CONSTRAINT accounts_reversed_by_fkey
  FOREIGN KEY (reversed_by) REFERENCES public.users(id),
ADD CONSTRAINT accounts_reversal_transaction_id_fkey
  FOREIGN KEY (reversal_transaction_id) REFERENCES public.accounts(id),
ADD CONSTRAINT accounts_reverses_transaction_id_fkey
  FOREIGN KEY (reverses_transaction_id) REFERENCES public.accounts(id);

-- Add foreign key constraints with explicit names for cost_center_transactions table
ALTER TABLE public.cost_center_transactions
ADD CONSTRAINT cost_center_transactions_reversed_by_fkey
  FOREIGN KEY (reversed_by) REFERENCES public.users(id),
ADD CONSTRAINT cost_center_transactions_reversal_transaction_id_fkey
  FOREIGN KEY (reversal_transaction_id) REFERENCES public.cost_center_transactions(id),
ADD CONSTRAINT cost_center_transactions_reverses_transaction_id_fkey
  FOREIGN KEY (reverses_transaction_id) REFERENCES public.cost_center_transactions(id);
