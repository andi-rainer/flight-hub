-- Create payment status history table
CREATE TABLE IF NOT EXISTS public.payment_status_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    membership_id UUID NOT NULL REFERENCES public.user_memberships(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL CHECK (new_status IN ('paid', 'unpaid', 'pending')),
    changed_by UUID NOT NULL REFERENCES public.users(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);

-- Add indexes for better query performance
CREATE INDEX idx_payment_status_history_membership_id ON public.payment_status_history(membership_id);
CREATE INDEX idx_payment_status_history_changed_at ON public.payment_status_history(changed_at DESC);

-- Enable RLS
ALTER TABLE public.payment_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Board members can view all payment history
CREATE POLICY "Board members can view payment history"
    ON public.payment_status_history
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND 'board' = ANY(users.role)
        )
    );

-- Board members can insert payment history (handled by trigger and actions)
CREATE POLICY "Board members can insert payment history"
    ON public.payment_status_history
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND 'board' = ANY(users.role)
        )
    );

-- Add comment
COMMENT ON TABLE public.payment_status_history IS 'Tracks all changes to membership payment status for audit trail';
