-- Table for user-defined custom units (presets: piece, meter, kWh, kg are built-in)
CREATE TABLE IF NOT EXISTS public.custom_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL UNIQUE
);

-- Enable RLS
ALTER TABLE public.custom_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for everyone"
ON public.custom_units
FOR ALL
USING (true)
WITH CHECK (true);
