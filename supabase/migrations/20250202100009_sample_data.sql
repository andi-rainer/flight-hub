-- =====================================================
-- SAMPLE DATA (OPTIONAL - FOR DEVELOPMENT ONLY)
-- =====================================================
-- This migration adds sample data for development and testing
--
-- **WARNING**: Only run this in development/staging environments!
-- DO NOT run in production!
--
-- To skip this migration, simply delete or rename this file.
--
-- Consolidated from:
-- - 20250116000001_sample_data.sql
--
-- =====================================================

-- NOTE: This file should be modified or removed based on your needs.
-- The original sample_data migration file should be reviewed for
-- any specific test data you want to include.

-- Example: Sample aircraft (commented out - uncomment if needed)
/*
INSERT INTO public.planes (tail_number, type, empty_weight, max_fuel, color, billing_unit, default_rate, active) VALUES
    ('D-EABC', 'Cessna 172', 750, 180, '#3b82f6', 'hour', 150.00, true),
    ('D-EXYZ', 'Piper PA-28', 650, 200, '#ef4444', 'hour', 140.00, true)
ON CONFLICT (tail_number) DO NOTHING;
*/

-- Example: Sample cost centers (commented out - uncomment if needed)
/*
INSERT INTO public.cost_centers (name, description) VALUES
    ('Flight Training', 'Flight instruction and training operations'),
    ('Aircraft Ferry', 'Aircraft repositioning and ferry flights')
ON CONFLICT (name) DO NOTHING;
*/

-- Add your own sample data here as needed for development

COMMENT ON SCHEMA public IS 'Sample data for development - DO NOT USE IN PRODUCTION';
