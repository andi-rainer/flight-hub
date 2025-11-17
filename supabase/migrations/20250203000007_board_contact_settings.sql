-- ============================================================================
-- BOARD CONTACT SETTINGS
-- ============================================================================
-- Stores configurable contact information for board members
-- Displayed on account-inactive page and other public-facing pages
-- ============================================================================

CREATE TABLE IF NOT EXISTS board_contact_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_name VARCHAR(255),
  office_hours TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

COMMENT ON TABLE board_contact_settings IS 'Configurable board contact information shown on account-inactive and other pages';
COMMENT ON COLUMN board_contact_settings.contact_email IS 'Email address for contacting the board';
COMMENT ON COLUMN board_contact_settings.contact_phone IS 'Phone number for contacting the club/board';
COMMENT ON COLUMN board_contact_settings.contact_name IS 'Name shown as contact person (e.g., "Board Secretary")';
COMMENT ON COLUMN board_contact_settings.office_hours IS 'Optional office hours information';

-- Create single row for settings (only one record allowed)
CREATE UNIQUE INDEX idx_board_contact_settings_singleton ON board_contact_settings ((true));

COMMENT ON INDEX idx_board_contact_settings_singleton IS 'Ensures only one settings record exists';

-- Insert default empty settings
INSERT INTO board_contact_settings (id) VALUES (gen_random_uuid());

-- RLS Policies
ALTER TABLE board_contact_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read contact settings (for account-inactive page)
CREATE POLICY "Anyone can view board contact settings"
  ON board_contact_settings FOR SELECT
  USING (true);

-- Only board members can update
CREATE POLICY "Board members can update contact settings"
  ON board_contact_settings FOR UPDATE
  USING (is_board_member(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_board_contact_settings_updated_at
  BEFORE UPDATE ON board_contact_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
