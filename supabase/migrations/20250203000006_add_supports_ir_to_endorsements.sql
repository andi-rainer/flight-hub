-- ============================================================================
-- ADD SUPPORTS_IR FIELD TO ENDORSEMENTS
-- ============================================================================
-- Adds a configuration field to endorsements to specify whether that
-- endorsement/rating can have IR (Instrument Rating) privileges.
-- Only endorsements with supports_ir=true will show IR options during upload.
-- ============================================================================

-- Add supports_ir column
ALTER TABLE endorsements
  ADD COLUMN IF NOT EXISTS supports_ir BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN endorsements.supports_ir IS 'Whether this endorsement/rating can have Instrument Rating (IR) privileges';

-- Update predefined endorsements to set which ones support IR
-- Aircraft class ratings (SEP, MEP, SET) can have IR
UPDATE endorsements SET supports_ir = true WHERE code IN ('SEP', 'MEP', 'SET');

-- TMG can have IR in some jurisdictions
UPDATE endorsements SET supports_ir = true WHERE code = 'TMG';

-- IR itself is standalone, doesn't have "IR for IR"
UPDATE endorsements SET supports_ir = false WHERE code = 'IR';

-- Instructor ratings don't have IR
UPDATE endorsements SET supports_ir = false WHERE code IN ('FI', 'CRI', 'IRI', 'TRI', 'SFI');

-- Examiner ratings don't have IR
UPDATE endorsements SET supports_ir = false WHERE code IN ('FE', 'TRE', 'CRE', 'IRE');

-- NIGHT and AEROBATIC don't have IR
UPDATE endorsements SET supports_ir = false WHERE code IN ('NIGHT', 'AEROBATIC');

-- Skydiving endorsements don't have IR
UPDATE endorsements SET supports_ir = false WHERE code IN ('AFF_I', 'TANDEM_I', 'COACH', 'VIDEOGRAPHER');
