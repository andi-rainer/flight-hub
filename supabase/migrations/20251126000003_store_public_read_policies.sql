-- Allow public read access to voucher_types, skydive_operation_days, and manifest_booking_timeframes for the store frontend

-- Voucher Types: Public read for store catalog
CREATE POLICY "Allow public read access to voucher types"
  ON voucher_types
  FOR SELECT
  TO anon, authenticated
  USING (active = true); -- Only show active voucher types

-- Board members can manage voucher types
CREATE POLICY "Board and manifest can manage voucher types"
  ON voucher_types
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND ('board' = ANY(role) OR EXISTS (
        SELECT 1 FROM user_functions uf
        JOIN functions_master fm ON uf.function_id = fm.id
        WHERE uf.user_id = auth.uid()
        AND fm.code = 'manifest_coordinator'
      ))
    )
  );

-- Skydive Operation Days: Public read for available days only
CREATE POLICY "Allow public read access to active operation days"
  ON skydive_operation_days
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'planned' OR status = 'active'
  );

-- Manifest Booking Timeframes: Public read for active timeframes
CREATE POLICY "Allow public read access to active timeframes"
  ON manifest_booking_timeframes
  FOR SELECT
  TO anon, authenticated
  USING (active = true);
