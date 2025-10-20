-- Enable realtime for documents and notifications tables
-- This ensures that real-time subscriptions work properly

-- Enable realtime on documents table
ALTER PUBLICATION supabase_realtime ADD TABLE documents;

-- Enable realtime on notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Force schema reload
NOTIFY pgrst, 'reload schema';

-- Add comment
COMMENT ON TABLE documents IS 'Documents table with realtime enabled';
COMMENT ON TABLE notifications IS 'Notifications table with realtime enabled';
