-- Create airport_fees table
CREATE TABLE IF NOT EXISTS public.airport_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    icao_code VARCHAR(4) NOT NULL UNIQUE,
    airport_name TEXT NOT NULL,
    landing_fee NUMERIC(10, 2) DEFAULT 0,
    approach_fee NUMERIC(10, 2) DEFAULT 0,
    parking_fee NUMERIC(10, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add check constraint to ensure ICAO code is exactly 4 characters
ALTER TABLE public.airport_fees
ADD CONSTRAINT airport_fees_icao_code_length CHECK (LENGTH(icao_code) = 4);

-- Create index on icao_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_airport_fees_icao_code ON public.airport_fees(icao_code);

-- Enable RLS
ALTER TABLE public.airport_fees ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read airport fees
CREATE POLICY "Allow authenticated users to read airport fees"
ON public.airport_fees
FOR SELECT
TO authenticated
USING (true);

-- Allow board members to manage airport fees
CREATE POLICY "Allow board members to insert airport fees"
ON public.airport_fees
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND 'board' = ANY(users.role)
    )
);

CREATE POLICY "Allow board members to update airport fees"
ON public.airport_fees
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND 'board' = ANY(users.role)
    )
);

CREATE POLICY "Allow board members to delete airport fees"
ON public.airport_fees
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND 'board' = ANY(users.role)
    )
);

-- Grant permissions
GRANT SELECT ON public.airport_fees TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.airport_fees TO authenticated;
