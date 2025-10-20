-- Enable realtime for reservations table
-- This ensures that real-time subscriptions work properly for reservations

-- Enable realtime on reservations table
ALTER PUBLICATION supabase_realtime ADD TABLE reservations;

-- Force schema reload
NOTIFY pgrst, 'reload schema';

-- Add comment
COMMENT ON TABLE reservations IS 'Reservations table with realtime enabled';
