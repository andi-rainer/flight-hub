-- Add TACH and HOBBS hours to maintenance records
-- These are manually entered meter readings, not automatically calculated

ALTER TABLE public.maintenance_records
ADD COLUMN IF NOT EXISTS tach_hours DECIMAL(10,1),
ADD COLUMN IF NOT EXISTS hobbs_hours DECIMAL(10,1);

COMMENT ON COLUMN public.maintenance_records.tach_hours IS 'TACH meter reading at time of maintenance (manually entered)';
COMMENT ON COLUMN public.maintenance_records.hobbs_hours IS 'HOBBS meter reading at time of maintenance (manually entered)';
