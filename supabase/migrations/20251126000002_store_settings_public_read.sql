-- Allow public read access to store_settings for the store frontend
-- The store needs to read these settings but should not be able to modify them

CREATE POLICY "Allow public read access to store settings"
  ON store_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Board members can still update (this policy was missing)
CREATE POLICY "Board members can update store settings"
  ON store_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND 'board' = ANY(role)
    )
  );

-- Board members can insert if no settings exist yet
CREATE POLICY "Board members can insert store settings"
  ON store_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND 'board' = ANY(role)
    )
  );
