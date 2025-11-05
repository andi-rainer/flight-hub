-- Allow treasurers to manage airports and aircraft airport fees

-- =====================================================
-- AIRPORTS TABLE - Add treasurer access
-- =====================================================

-- Treasurers can insert airports
CREATE POLICY "Treasurers can insert airports"
    ON public.airports FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_functions uf
            JOIN public.functions_master fm ON uf.function_id = fm.id
            WHERE uf.user_id = auth.uid()
            AND fm.code = 'treasurer'
            AND fm.active = true
        )
    );

-- Treasurers can update airports
CREATE POLICY "Treasurers can update airports"
    ON public.airports FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_functions uf
            JOIN public.functions_master fm ON uf.function_id = fm.id
            WHERE uf.user_id = auth.uid()
            AND fm.code = 'treasurer'
            AND fm.active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_functions uf
            JOIN public.functions_master fm ON uf.function_id = fm.id
            WHERE uf.user_id = auth.uid()
            AND fm.code = 'treasurer'
            AND fm.active = true
        )
    );

-- Treasurers can delete airports
CREATE POLICY "Treasurers can delete airports"
    ON public.airports FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_functions uf
            JOIN public.functions_master fm ON uf.function_id = fm.id
            WHERE uf.user_id = auth.uid()
            AND fm.code = 'treasurer'
            AND fm.active = true
        )
    );

-- =====================================================
-- AIRCRAFT_AIRPORT_FEES TABLE - Add treasurer access
-- =====================================================

-- Treasurers can insert aircraft airport fees
CREATE POLICY "Treasurers can insert aircraft airport fees"
    ON public.aircraft_airport_fees FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_functions uf
            JOIN public.functions_master fm ON uf.function_id = fm.id
            WHERE uf.user_id = auth.uid()
            AND fm.code = 'treasurer'
            AND fm.active = true
        )
    );

-- Treasurers can update aircraft airport fees
CREATE POLICY "Treasurers can update aircraft airport fees"
    ON public.aircraft_airport_fees FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_functions uf
            JOIN public.functions_master fm ON uf.function_id = fm.id
            WHERE uf.user_id = auth.uid()
            AND fm.code = 'treasurer'
            AND fm.active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_functions uf
            JOIN public.functions_master fm ON uf.function_id = fm.id
            WHERE uf.user_id = auth.uid()
            AND fm.code = 'treasurer'
            AND fm.active = true
        )
    );

-- Treasurers can delete aircraft airport fees
CREATE POLICY "Treasurers can delete aircraft airport fees"
    ON public.aircraft_airport_fees FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_functions uf
            JOIN public.functions_master fm ON uf.function_id = fm.id
            WHERE uf.user_id = auth.uid()
            AND fm.code = 'treasurer'
            AND fm.active = true
        )
    );
