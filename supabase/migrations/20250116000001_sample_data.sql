-- FlightHub Sample Data Migration
-- This migration adds sample data for testing and development

-- =====================================================
-- SAMPLE FUNCTIONS MASTER DATA
-- =====================================================

INSERT INTO public.functions_master (name, yearly_rate, description) VALUES
    ('President', 0, 'Club President - Executive leadership'),
    ('Vice President', 0, 'Vice President - Assists president'),
    ('Treasurer', 0, 'Financial management and accounting'),
    ('Secretary', 0, 'Administrative and documentation'),
    ('Safety Officer', 0, 'Safety oversight and compliance'),
    ('Maintenance Coordinator', 0, 'Aircraft maintenance coordination'),
    ('Flight Instructor', 500, 'Certified flight instructor'),
    ('Aircraft Manager', 200, 'Specific aircraft fleet management'),
    ('Events Coordinator', 0, 'Social and flying events organization');

-- =====================================================
-- SAMPLE PLANES DATA
-- =====================================================

-- Note: Actual users must be created through auth.users first
-- These planes can be inserted immediately

INSERT INTO public.planes (
    tail_number,
    type,
    empty_weight,
    max_fuel,
    fuel_consumption,
    color,
    nav_equipment,
    xdpr_equipment,
    emer_equipment,
    max_mass,
    cg_limits,
    active
) VALUES
(
    'OE-ABC',
    'Cessna 172N Skyhawk',
    750.00,
    212.00,
    35.00,
    'White/Blue',
    ARRAY['VOR', 'ADF', 'GPS', 'Transponder Mode C'],
    'COM VHF, NAV VHF x2, GPS',
    'ELT 406MHz, Life jackets x4, First aid kit',
    1157.00,
    '{"forward": 35.0, "aft": 47.3, "arms": [{"position": 35, "moment": 0}, {"position": 47.3, "moment": 0}]}'::jsonb,
    true
),
(
    'OE-XYZ',
    'Piper PA-28-181 Archer II',
    620.00,
    189.00,
    32.00,
    'White/Red',
    ARRAY['VOR', 'GPS', 'Transponder Mode S', 'ADS-B Out'],
    'COM VHF x2, NAV VHF x2, GPS WAAS',
    'ELT 406MHz, Life jackets x4, First aid kit, Fire extinguisher',
    1043.00,
    '{"forward": 78.9, "aft": 94.2, "arms": [{"position": 78.9, "moment": 0}, {"position": 94.2, "moment": 0}]}'::jsonb,
    true
),
(
    'OE-DEF',
    'Diamond DA40 NG',
    855.00,
    157.00,
    22.00,
    'White/Orange',
    ARRAY['VOR', 'GPS', 'Transponder Mode S', 'ADS-B Out', 'ADS-B In'],
    'Garmin G1000, COM VHF x2, NAV VHF x2, GPS WAAS',
    'ELT 406MHz with GPS, Life jackets x4, First aid kit, Fire extinguisher, Emergency locator',
    1320.00,
    '{"forward": 77.8, "aft": 87.4, "arms": [{"position": 77.8, "moment": 0}, {"position": 87.4, "moment": 0}]}'::jsonb,
    true
),
(
    'OE-OLD',
    'Cessna 152',
    490.00,
    95.00,
    24.00,
    'White',
    ARRAY['VOR', 'Transponder Mode C'],
    'COM VHF, NAV VHF',
    'ELT 121.5MHz, First aid kit',
    757.00,
    '{"forward": 31.0, "aft": 40.5, "arms": [{"position": 31, "moment": 0}, {"position": 40.5, "moment": 0}]}'::jsonb,
    false
);

-- =====================================================
-- SAMPLE DATA NOTES
-- =====================================================

-- User data should be created through Supabase Auth signup
-- The trigger will automatically create entries in public.users

-- Sample reservations and flightlog entries require actual user IDs
-- These should be created after authentication is set up

-- To add board members after user creation, run:
-- UPDATE public.users SET role = ARRAY['member', 'board'] WHERE email = 'boardmember@example.com';

-- To add functions to a user:
-- UPDATE public.users SET functions = ARRAY['President', 'Safety Officer'] WHERE email = 'user@example.com';

-- =====================================================
-- HELPER QUERIES FOR TESTING
-- =====================================================

-- Create a test reservation (requires user_id and plane_id):
-- INSERT INTO public.reservations (plane_id, user_id, start_time, end_time, status, remarks)
-- VALUES (
--     (SELECT id FROM public.planes WHERE tail_number = 'OE-ABC' LIMIT 1),
--     (SELECT id FROM public.users WHERE email = 'pilot@example.com' LIMIT 1),
--     NOW() + INTERVAL '2 days',
--     NOW() + INTERVAL '2 days 3 hours',
--     'active',
--     'Local flight for currency'
-- );

-- Create a test flightlog entry (requires user_id and plane_id):
-- INSERT INTO public.flightlog (
--     plane_id, pilot_id, block_on, block_off, takeoff_time, landing_time, fuel, oil
-- ) VALUES (
--     (SELECT id FROM public.planes WHERE tail_number = 'OE-ABC' LIMIT 1),
--     (SELECT id FROM public.users WHERE email = 'pilot@example.com' LIMIT 1),
--     NOW() - INTERVAL '5 hours',
--     NOW() - INTERVAL '3 hours',
--     NOW() - INTERVAL '4 hours 55 minutes',
--     NOW() - INTERVAL '3 hours 5 minutes',
--     35.5,
--     6.2
-- );

-- Add a test document for an aircraft:
-- INSERT INTO public.documents (
--     plane_id, name, file_url, uploaded_by, expiry_date, approved, blocks_aircraft, tags
-- ) VALUES (
--     (SELECT id FROM public.planes WHERE tail_number = 'OE-ABC' LIMIT 1),
--     'Certificate of Airworthiness',
--     'https://storage.example.com/docs/coa-oe-abc.pdf',
--     (SELECT id FROM public.users WHERE email = 'admin@example.com' LIMIT 1),
--     '2026-12-31',
--     true,
--     true,
--     ARRAY['airworthiness', 'required', 'annual']
-- );

-- Create account transaction:
-- INSERT INTO public.accounts (user_id, amount, description, created_by)
-- VALUES (
--     (SELECT id FROM public.users WHERE email = 'member@example.com' LIMIT 1),
--     -150.00,
--     'Flight time charge - 1.5 hours @ 100/hr',
--     (SELECT id FROM public.users WHERE email = 'treasurer@example.com' LIMIT 1)
-- );
