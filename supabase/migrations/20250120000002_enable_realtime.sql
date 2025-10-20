-- Enable realtime for documents, notifications, and reservations tables
-- This ensures that real-time subscriptions work properly

-- Enable realtime on documents table
ALTER PUBLICATION supabase_realtime ADD TABLE documents;

-- Enable realtime on notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Enable realtime on reservations table
ALTER PUBLICATION supabase_realtime ADD TABLE reservations;

-- Force schema reload
NOTIFY pgrst, 'reload schema';

-- Add comment
COMMENT ON TABLE documents IS 'Documents table with realtime enabled';
COMMENT ON TABLE notifications IS 'Notifications table with realtime enabled';
COMMENT ON TABLE reservations IS 'Reservations table with realtime enabled';
