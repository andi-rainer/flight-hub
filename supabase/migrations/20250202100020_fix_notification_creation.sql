-- =====================================================
-- FIX NOTIFICATION CREATION
-- =====================================================
-- Creates a function to insert notifications with elevated privileges
-- This allows non-board members to create notifications for board members
-- (e.g., when a pilot creates a flight log with warnings)
-- =====================================================

-- Create a function to create notifications with SECURITY DEFINER
-- This allows the function to bypass RLS and create notifications for any user
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_link TEXT DEFAULT NULL,
    p_document_id UUID DEFAULT NULL,
    p_flightlog_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    -- Insert the notification
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        link,
        document_id,
        flightlog_id,
        read
    ) VALUES (
        p_user_id,
        p_type,
        p_title,
        p_message,
        p_link,
        p_document_id,
        p_flightlog_id,
        FALSE
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated;

-- Add a comment
COMMENT ON FUNCTION public.create_notification IS
'Creates a notification for a user with elevated privileges. Used for system-generated notifications.';
