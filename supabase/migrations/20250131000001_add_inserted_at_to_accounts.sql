-- Add inserted_at column to track when transaction records are actually created
-- This is separate from created_at which is the transaction date that can be edited

ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Set inserted_at to created_at for existing records (best approximation we have)
UPDATE public.accounts
SET inserted_at = created_at
WHERE inserted_at IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_accounts_inserted_at ON public.accounts(inserted_at);

COMMENT ON COLUMN public.accounts.inserted_at IS 'Timestamp when the transaction record was inserted into the database (immutable)';
COMMENT ON COLUMN public.accounts.created_at IS 'Transaction date that can be set by the user (editable within 1 hour of insertion)';

-- Force schema reload
NOTIFY pgrst, 'reload schema';
