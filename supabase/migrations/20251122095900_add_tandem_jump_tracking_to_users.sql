-- Add tandem jump completion tracking to users table
-- This allows tracking which short-term members have completed their tandem jump

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS tandem_jump_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tandem_jump_date DATE;

-- Index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_users_tandem_jump_completed
  ON public.users(tandem_jump_completed)
  WHERE tandem_jump_completed = false;

-- Comments
COMMENT ON COLUMN public.users.tandem_jump_completed IS 'Indicates if this user (typically short-term member) has completed their tandem skydive jump';
COMMENT ON COLUMN public.users.tandem_jump_date IS 'Date when the tandem jump was completed';
