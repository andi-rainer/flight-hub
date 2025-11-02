-- =====================================================
-- REALTIME SUBSCRIPTIONS
-- =====================================================
-- This migration enables realtime subscriptions on key tables
--
-- Consolidated from:
-- - 20250120000002_enable_realtime.sql
-- - 20250123000000_enable_reservations_realtime.sql (duplicate, removed)
--
-- =====================================================

-- Enable realtime on documents table
-- Allows real-time updates when documents are uploaded/approved
ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;

-- Enable realtime on notifications table
-- Allows users to receive notifications in real-time
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Enable realtime on reservations table
-- Allows real-time calendar updates when reservations change
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON PUBLICATION supabase_realtime IS 'Supabase realtime publication for live data updates';

-- Tables with realtime enabled:
-- - documents: Real-time document upload/approval notifications
-- - notifications: Live notification delivery
-- - reservations: Live calendar updates
