-- Allow function-specific access to system_settings
-- Manifest coordinators can view/update tandem registration settings
-- Treasurers can view/update airport fee settings

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Board members can view settings" ON public.system_settings;
DROP POLICY IF EXISTS "Board members can update settings" ON public.system_settings;

-- Create more granular policies

-- 1. Board members can view all settings
CREATE POLICY "Board members can view all settings"
    ON public.system_settings FOR SELECT
    TO authenticated
    USING (public.is_board_member(auth.uid()));

-- 2. Board members can update all settings
CREATE POLICY "Board members can update all settings"
    ON public.system_settings FOR UPDATE
    TO authenticated
    USING (public.is_board_member(auth.uid()))
    WITH CHECK (public.is_board_member(auth.uid()));

-- 3. Manifest coordinators can view tandem settings
CREATE POLICY "Manifest coordinators can view tandem settings"
    ON public.system_settings FOR SELECT
    TO authenticated
    USING (
        key LIKE 'tandem_%' AND
        EXISTS (
            SELECT 1 FROM public.user_functions uf
            JOIN public.functions_master fm ON uf.function_id = fm.id
            WHERE uf.user_id = auth.uid()
            AND fm.code = 'manifest_coordinator'
            AND fm.active = true
        )
    );

-- 4. Manifest coordinators can update tandem settings
CREATE POLICY "Manifest coordinators can update tandem settings"
    ON public.system_settings FOR UPDATE
    TO authenticated
    USING (
        key LIKE 'tandem_%' AND
        EXISTS (
            SELECT 1 FROM public.user_functions uf
            JOIN public.functions_master fm ON uf.function_id = fm.id
            WHERE uf.user_id = auth.uid()
            AND fm.code = 'manifest_coordinator'
            AND fm.active = true
        )
    )
    WITH CHECK (
        key LIKE 'tandem_%' AND
        EXISTS (
            SELECT 1 FROM public.user_functions uf
            JOIN public.functions_master fm ON uf.function_id = fm.id
            WHERE uf.user_id = auth.uid()
            AND fm.code = 'manifest_coordinator'
            AND fm.active = true
        )
    );

-- 5. Treasurers can view airport fee settings
CREATE POLICY "Treasurers can view airport fee settings"
    ON public.system_settings FOR SELECT
    TO authenticated
    USING (
        key LIKE 'airport_%' AND
        EXISTS (
            SELECT 1 FROM public.user_functions uf
            JOIN public.functions_master fm ON uf.function_id = fm.id
            WHERE uf.user_id = auth.uid()
            AND fm.code = 'treasurer'
            AND fm.active = true
        )
    );

-- 6. Treasurers can update airport fee settings
CREATE POLICY "Treasurers can update airport fee settings"
    ON public.system_settings FOR UPDATE
    TO authenticated
    USING (
        key LIKE 'airport_%' AND
        EXISTS (
            SELECT 1 FROM public.user_functions uf
            JOIN public.functions_master fm ON uf.function_id = fm.id
            WHERE uf.user_id = auth.uid()
            AND fm.code = 'treasurer'
            AND fm.active = true
        )
    )
    WITH CHECK (
        key LIKE 'airport_%' AND
        EXISTS (
            SELECT 1 FROM public.user_functions uf
            JOIN public.functions_master fm ON uf.function_id = fm.id
            WHERE uf.user_id = auth.uid()
            AND fm.code = 'treasurer'
            AND fm.active = true
        )
    );
