-- Fix flightlog time constraints
-- The correct order is: Block OFF (start taxi) → Takeoff → Landing → Block ON (end taxi)
-- This migration reverses the block_on and block_off logic

-- Drop existing constraints
ALTER TABLE public.flightlog
  DROP CONSTRAINT IF EXISTS flightlog_block_time_check,
  DROP CONSTRAINT IF EXISTS flightlog_takeoff_after_block_on,
  DROP CONSTRAINT IF EXISTS flightlog_landing_before_block_off;

-- Add correct constraints
-- block_off < block_on (block_off happens first, block_on happens last)
ALTER TABLE public.flightlog
  ADD CONSTRAINT flightlog_block_time_check CHECK (block_on > block_off);

-- takeoff_time >= block_off (takeoff after or at block off)
ALTER TABLE public.flightlog
  ADD CONSTRAINT flightlog_takeoff_after_block_off CHECK (takeoff_time >= block_off);

-- landing_time <= block_on (landing before or at block on)
ALTER TABLE public.flightlog
  ADD CONSTRAINT flightlog_landing_before_block_on CHECK (landing_time <= block_on);

-- Update the calculate_block_time function to use correct order
CREATE OR REPLACE FUNCTION public.calculate_block_time(
    p_block_on TIMESTAMPTZ,
    p_block_off TIMESTAMPTZ
)
RETURNS NUMERIC AS $$
BEGIN
    -- Block time is from block_off (start) to block_on (end)
    RETURN EXTRACT(EPOCH FROM (p_block_on - p_block_off)) / 3600.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
