-- Add reversal tracking to transactions tables
-- This allows transactions to be "undone" by creating reversal transactions
-- Original transactions are never deleted, only marked as reversed

-- Add columns to accounts (user transactions)
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS reversed_at timestamptz,
ADD COLUMN IF NOT EXISTS reversed_by uuid REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS reversal_transaction_id uuid REFERENCES public.accounts(id),
ADD COLUMN IF NOT EXISTS reverses_transaction_id uuid REFERENCES public.accounts(id);

-- Add columns to cost_center_transactions
ALTER TABLE public.cost_center_transactions
ADD COLUMN IF NOT EXISTS reversed_at timestamptz,
ADD COLUMN IF NOT EXISTS reversed_by uuid REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS reversal_transaction_id uuid REFERENCES public.cost_center_transactions(id),
ADD COLUMN IF NOT EXISTS reverses_transaction_id uuid REFERENCES public.cost_center_transactions(id);

-- Add comments
COMMENT ON COLUMN public.accounts.reversed_at IS 'When this transaction was reversed/undone';
COMMENT ON COLUMN public.accounts.reversed_by IS 'User who reversed this transaction';
COMMENT ON COLUMN public.accounts.reversal_transaction_id IS 'The transaction that reversed this one (if reversed)';
COMMENT ON COLUMN public.accounts.reverses_transaction_id IS 'The original transaction that this transaction reverses (if this is a reversal)';

COMMENT ON COLUMN public.cost_center_transactions.reversed_at IS 'When this transaction was reversed/undone';
COMMENT ON COLUMN public.cost_center_transactions.reversed_by IS 'User who reversed this transaction';
COMMENT ON COLUMN public.cost_center_transactions.reversal_transaction_id IS 'The transaction that reversed this one (if reversed)';
COMMENT ON COLUMN public.cost_center_transactions.reverses_transaction_id IS 'The original transaction that this transaction reverses (if this is a reversal)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_reversed_at ON public.accounts(reversed_at);
CREATE INDEX IF NOT EXISTS idx_accounts_reversal_transaction_id ON public.accounts(reversal_transaction_id);
CREATE INDEX IF NOT EXISTS idx_accounts_reverses_transaction_id ON public.accounts(reverses_transaction_id);

CREATE INDEX IF NOT EXISTS idx_cost_center_transactions_reversed_at ON public.cost_center_transactions(reversed_at);
CREATE INDEX IF NOT EXISTS idx_cost_center_transactions_reversal_transaction_id ON public.cost_center_transactions(reversal_transaction_id);
CREATE INDEX IF NOT EXISTS idx_cost_center_transactions_reverses_transaction_id ON public.cost_center_transactions(reverses_transaction_id);
