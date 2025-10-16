-- FlightHub Helper Queries
-- Common operations and useful queries for development and administration

-- =====================================================
-- USER MANAGEMENT
-- =====================================================

-- Promote user to board member
-- UPDATE public.users
-- SET role = array_append(role, 'board')
-- WHERE email = 'user@example.com' AND NOT ('board' = ANY(role));

-- Demote user from board
-- UPDATE public.users
-- SET role = array_remove(role, 'board')
-- WHERE email = 'user@example.com';

-- Assign function to user
-- UPDATE public.users
-- SET functions = array_append(functions, 'President')
-- WHERE email = 'user@example.com' AND NOT ('President' = ANY(functions));

-- Remove function from user
-- UPDATE public.users
-- SET functions = array_remove(functions, 'President')
-- WHERE email = 'user@example.com';

-- Get all board members
-- SELECT id, email, name, surname, functions
-- FROM public.users
-- WHERE 'board' = ANY(role)
-- ORDER BY surname, name;

-- Get users with specific function
-- SELECT u.id, u.email, u.name, u.surname, fm.yearly_rate
-- FROM public.users u
-- CROSS JOIN UNNEST(u.functions) AS func
-- JOIN public.functions_master fm ON fm.name = func
-- WHERE func = 'Flight Instructor';

-- =====================================================
-- AIRCRAFT MANAGEMENT
-- =====================================================

-- Get all active aircraft with document status
-- SELECT
--     p.id,
--     p.tail_number,
--     p.type,
--     p.active,
--     can_reserve_aircraft(p.id) AS documents_valid,
--     COUNT(d.id) FILTER (WHERE d.blocks_aircraft = true AND d.expiry_date < CURRENT_DATE) AS expired_blocking_docs
-- FROM public.planes p
-- LEFT JOIN public.documents d ON d.plane_id = p.id
-- WHERE p.active = true
-- GROUP BY p.id;

-- Get aircraft with expiring documents (next 30 days)
-- SELECT
--     p.tail_number,
--     d.name AS document_name,
--     d.expiry_date,
--     d.expiry_date - CURRENT_DATE AS days_until_expiry,
--     d.blocks_aircraft
-- FROM public.documents d
-- JOIN public.planes p ON d.plane_id = p.id
-- WHERE d.expiry_date IS NOT NULL
-- AND d.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
-- ORDER BY d.expiry_date;

-- =====================================================
-- RESERVATION MANAGEMENT
-- =====================================================

-- Check for reservation conflicts
-- Function to find overlapping reservations for a specific time range and aircraft
-- SELECT r.*,
--     u.email,
--     u.name || ' ' || u.surname AS user_name
-- FROM public.reservations r
-- JOIN public.users u ON r.user_id = u.id
-- WHERE r.plane_id = 'PLANE_UUID'
-- AND r.status = 'active'
-- AND r.start_time < 'END_TIME'::timestamptz
-- AND r.end_time > 'START_TIME'::timestamptz;

-- Get today's reservations
-- SELECT
--     r.id,
--     p.tail_number,
--     u.name || ' ' || u.surname AS pilot_name,
--     r.start_time,
--     r.end_time,
--     r.priority,
--     r.remarks
-- FROM public.reservations r
-- JOIN public.planes p ON r.plane_id = p.id
-- JOIN public.users u ON r.user_id = u.id
-- WHERE r.status = 'active'
-- AND DATE(r.start_time) = CURRENT_DATE
-- ORDER BY r.start_time;

-- Get user's reservation history
-- SELECT
--     r.*,
--     p.tail_number,
--     p.type,
--     EXTRACT(EPOCH FROM (r.end_time - r.start_time)) / 3600.0 AS duration_hours
-- FROM public.reservations r
-- JOIN public.planes p ON r.plane_id = p.id
-- WHERE r.user_id = 'USER_UUID'
-- ORDER BY r.start_time DESC;

-- Promote standby reservation to active
-- UPDATE public.reservations
-- SET status = 'active'
-- WHERE id = 'RESERVATION_UUID' AND status = 'standby';

-- Cancel reservation
-- UPDATE public.reservations
-- SET status = 'cancelled'
-- WHERE id = 'RESERVATION_UUID';

-- =====================================================
-- FLIGHTLOG MANAGEMENT
-- =====================================================

-- Get recent flights with calculated times
-- SELECT * FROM public.flightlog_with_times
-- ORDER BY block_on DESC
-- LIMIT 20;

-- Get unlocked flightlog entries (need attention)
-- SELECT
--     f.*,
--     p.tail_number,
--     u.name || ' ' || u.surname AS pilot_name,
--     calculate_block_time(f.block_on, f.block_off) AS block_hours
-- FROM public.flightlog f
-- JOIN public.planes p ON f.plane_id = p.id
-- JOIN public.users u ON f.pilot_id = u.id
-- WHERE f.locked = false
-- AND f.block_on < NOW() - INTERVAL '24 hours'
-- ORDER BY f.block_on DESC;

-- Lock flightlog entry (board only)
-- UPDATE public.flightlog
-- SET locked = true
-- WHERE id = 'FLIGHTLOG_UUID';

-- Mark flightlog as charged (board only)
-- UPDATE public.flightlog
-- SET charged = true
-- WHERE id = 'FLIGHTLOG_UUID' AND locked = true;

-- Get pilot's flight statistics for current year
-- SELECT
--     u.name || ' ' || u.surname AS pilot_name,
--     COUNT(*) AS number_of_flights,
--     SUM(calculate_flight_time(f.takeoff_time, f.landing_time)) AS total_flight_hours,
--     SUM(calculate_block_time(f.block_on, f.block_off)) AS total_block_hours,
--     AVG(calculate_flight_time(f.takeoff_time, f.landing_time)) AS avg_flight_hours
-- FROM public.flightlog f
-- JOIN public.users u ON f.pilot_id = u.id
-- WHERE f.pilot_id = 'USER_UUID'
-- AND EXTRACT(YEAR FROM f.block_on) = EXTRACT(YEAR FROM NOW())
-- GROUP BY u.name, u.surname;

-- Get aircraft utilization statistics
-- SELECT
--     p.tail_number,
--     p.type,
--     COUNT(f.id) AS number_of_flights,
--     SUM(calculate_flight_time(f.takeoff_time, f.landing_time)) AS total_flight_hours,
--     SUM(f.fuel) AS total_fuel_consumed,
--     AVG(calculate_flight_time(f.takeoff_time, f.landing_time)) AS avg_flight_duration
-- FROM public.planes p
-- LEFT JOIN public.flightlog f ON f.plane_id = p.id
--     AND f.block_on >= NOW() - INTERVAL '1 year'
-- GROUP BY p.id, p.tail_number, p.type
-- ORDER BY total_flight_hours DESC NULLS LAST;

-- =====================================================
-- DOCUMENT MANAGEMENT
-- =====================================================

-- Get all documents requiring approval
-- SELECT
--     d.*,
--     CASE
--         WHEN d.plane_id IS NOT NULL THEN 'Aircraft: ' || p.tail_number
--         WHEN d.user_id IS NOT NULL THEN 'User: ' || u.email
--         ELSE 'General: ' || d.category
--     END AS entity,
--     uploader.name || ' ' || uploader.surname AS uploaded_by_name
-- FROM public.documents d
-- LEFT JOIN public.planes p ON d.plane_id = p.id
-- LEFT JOIN public.users u ON d.user_id = u.id
-- JOIN public.users uploader ON d.uploaded_by = uploader.id
-- WHERE d.approved = false
-- ORDER BY d.uploaded_at DESC;

-- Approve document (board only)
-- UPDATE public.documents
-- SET approved = true
-- WHERE id = 'DOCUMENT_UUID';

-- Get all documents for an aircraft
-- SELECT
--     d.name,
--     d.expiry_date,
--     d.blocks_aircraft,
--     d.approved,
--     d.tags,
--     CASE
--         WHEN d.expiry_date IS NULL THEN 'No expiry'
--         WHEN d.expiry_date < CURRENT_DATE THEN 'EXPIRED'
--         WHEN d.expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring soon'
--         ELSE 'Valid'
--     END AS status
-- FROM public.documents d
-- WHERE d.plane_id = 'PLANE_UUID'
-- ORDER BY d.expiry_date NULLS LAST;

-- Get user's documents
-- SELECT
--     d.name,
--     d.expiry_date,
--     d.approved,
--     d.tags,
--     CASE
--         WHEN d.expiry_date IS NULL THEN 'No expiry'
--         WHEN d.expiry_date < CURRENT_DATE THEN 'EXPIRED'
--         WHEN d.expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring soon'
--         ELSE 'Valid'
--     END AS status
-- FROM public.documents d
-- WHERE d.user_id = 'USER_UUID'
-- ORDER BY d.expiry_date NULLS LAST;

-- =====================================================
-- FINANCIAL MANAGEMENT
-- =====================================================

-- Get user account balance
-- SELECT * FROM public.user_balances
-- WHERE user_id = 'USER_UUID';

-- Get all users with negative balances
-- SELECT * FROM public.user_balances
-- WHERE balance < 0
-- ORDER BY balance;

-- Create account transaction (board only)
-- INSERT INTO public.accounts (user_id, amount, description, created_by)
-- VALUES (
--     'USER_UUID',
--     -100.50,  -- negative for charges, positive for payments
--     'Flight time charge: 1.5 hours @ $67/hr',
--     auth.uid()
-- );

-- Get recent transactions for user
-- SELECT
--     a.*,
--     creator.name || ' ' || creator.surname AS created_by_name
-- FROM public.accounts a
-- JOIN public.users creator ON a.created_by = creator.id
-- WHERE a.user_id = 'USER_UUID'
-- ORDER BY a.created_at DESC
-- LIMIT 20;

-- Monthly financial summary
-- SELECT
--     DATE_TRUNC('month', a.created_at) AS month,
--     COUNT(*) AS transaction_count,
--     SUM(CASE WHEN a.amount < 0 THEN a.amount ELSE 0 END) AS total_charges,
--     SUM(CASE WHEN a.amount > 0 THEN a.amount ELSE 0 END) AS total_payments,
--     SUM(a.amount) AS net_change
-- FROM public.accounts a
-- WHERE a.created_at >= NOW() - INTERVAL '12 months'
-- GROUP BY DATE_TRUNC('month', a.created_at)
-- ORDER BY month DESC;

-- =====================================================
-- NOTIFICATION MANAGEMENT
-- =====================================================

-- Get unread notifications for user
-- SELECT *
-- FROM public.notifications
-- WHERE user_id = 'USER_UUID' AND read = false
-- ORDER BY created_at DESC;

-- Mark notification as read
-- UPDATE public.notifications
-- SET read = true
-- WHERE id = 'NOTIFICATION_UUID' AND user_id = auth.uid();

-- Mark all notifications as read for user
-- UPDATE public.notifications
-- SET read = true
-- WHERE user_id = auth.uid() AND read = false;

-- Create notification for user (board only)
-- INSERT INTO public.notifications (user_id, type, message)
-- VALUES (
--     'USER_UUID',
--     'document_expiry',
--     'Your medical certificate expires in 30 days.'
-- );

-- Create notification for all users (board only)
-- INSERT INTO public.notifications (user_id, type, message)
-- SELECT id, 'announcement', 'Club meeting scheduled for next Saturday at 10:00 AM.'
-- FROM public.users;

-- Delete old read notifications
-- DELETE FROM public.notifications
-- WHERE read = true AND created_at < NOW() - INTERVAL '30 days';

-- =====================================================
-- REPORTS AND ANALYTICS
-- =====================================================

-- Club activity summary
-- SELECT
--     (SELECT COUNT(*) FROM public.users) AS total_members,
--     (SELECT COUNT(*) FROM public.users WHERE 'board' = ANY(role)) AS board_members,
--     (SELECT COUNT(*) FROM public.planes WHERE active = true) AS active_aircraft,
--     (SELECT COUNT(*) FROM public.reservations WHERE status = 'active' AND start_time >= NOW()) AS upcoming_reservations,
--     (SELECT COUNT(*) FROM public.flightlog WHERE block_on >= NOW() - INTERVAL '30 days') AS flights_last_30_days,
--     (SELECT SUM(calculate_flight_time(takeoff_time, landing_time)) FROM public.flightlog WHERE block_on >= NOW() - INTERVAL '30 days') AS flight_hours_last_30_days;

-- Most active pilots (last 12 months)
-- SELECT
--     u.name || ' ' || u.surname AS pilot_name,
--     COUNT(f.id) AS flights,
--     SUM(calculate_flight_time(f.takeoff_time, f.landing_time)) AS total_hours,
--     SUM(f.fuel) AS total_fuel
-- FROM public.flightlog f
-- JOIN public.users u ON f.pilot_id = u.id
-- WHERE f.block_on >= NOW() - INTERVAL '12 months'
-- GROUP BY u.id, u.name, u.surname
-- ORDER BY total_hours DESC
-- LIMIT 10;

-- Monthly flight activity trend
-- SELECT
--     DATE_TRUNC('month', f.block_on) AS month,
--     COUNT(*) AS number_of_flights,
--     SUM(calculate_flight_time(f.takeoff_time, f.landing_time)) AS flight_hours,
--     COUNT(DISTINCT f.pilot_id) AS unique_pilots,
--     COUNT(DISTINCT f.plane_id) AS aircraft_used
-- FROM public.flightlog f
-- WHERE f.block_on >= NOW() - INTERVAL '12 months'
-- GROUP BY DATE_TRUNC('month', f.block_on)
-- ORDER BY month DESC;

-- Aircraft revenue potential (charged vs uncharged flights)
-- SELECT
--     p.tail_number,
--     COUNT(f.id) FILTER (WHERE f.charged = true) AS charged_flights,
--     COUNT(f.id) FILTER (WHERE f.charged = false) AS uncharged_flights,
--     SUM(calculate_block_time(f.block_on, f.block_off)) FILTER (WHERE f.charged = true) AS charged_hours,
--     SUM(calculate_block_time(f.block_on, f.block_off)) FILTER (WHERE f.charged = false) AS uncharged_hours
-- FROM public.planes p
-- LEFT JOIN public.flightlog f ON f.plane_id = p.id
--     AND f.block_on >= NOW() - INTERVAL '6 months'
-- GROUP BY p.id, p.tail_number
-- ORDER BY uncharged_hours DESC NULLS LAST;

-- =====================================================
-- MAINTENANCE AND CLEANUP
-- =====================================================

-- Find old cancelled reservations (candidates for deletion)
-- SELECT *
-- FROM public.reservations
-- WHERE status = 'cancelled'
-- AND end_time < NOW() - INTERVAL '6 months';

-- Archive old reservations (move to archive table if created)
-- This is a placeholder - you would need to create an archive table first
-- INSERT INTO public.reservations_archive SELECT * FROM public.reservations
-- WHERE status = 'cancelled' AND end_time < NOW() - INTERVAL '1 year';
-- DELETE FROM public.reservations
-- WHERE status = 'cancelled' AND end_time < NOW() - INTERVAL '1 year';

-- Find orphaned documents (if users/planes were deleted)
-- SELECT d.*
-- FROM public.documents d
-- LEFT JOIN public.planes p ON d.plane_id = p.id
-- LEFT JOIN public.users u ON d.user_id = u.id
-- WHERE (d.plane_id IS NOT NULL AND p.id IS NULL)
--    OR (d.user_id IS NOT NULL AND u.id IS NULL);

-- Check RLS policy effectiveness (run as superuser)
-- This shows which tables have RLS enabled
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;

-- =====================================================
-- DATA INTEGRITY CHECKS
-- =====================================================

-- Check for reservations without corresponding aircraft
-- SELECT r.*
-- FROM public.reservations r
-- LEFT JOIN public.planes p ON r.plane_id = p.id
-- WHERE p.id IS NULL;

-- Check for flightlog entries with invalid time sequences
-- SELECT *
-- FROM public.flightlog
-- WHERE NOT (
--     block_off > block_on AND
--     landing_time > takeoff_time AND
--     takeoff_time >= block_on AND
--     landing_time <= block_off
-- );

-- Check for users without email
-- SELECT * FROM public.users WHERE email IS NULL OR email = '';

-- Check for overlapping active reservations (data integrity issue)
-- SELECT r1.*, r2.*
-- FROM public.reservations r1
-- JOIN public.reservations r2 ON r1.plane_id = r2.plane_id AND r1.id < r2.id
-- WHERE r1.status = 'active' AND r2.status = 'active'
-- AND r1.start_time < r2.end_time
-- AND r1.end_time > r2.start_time;
