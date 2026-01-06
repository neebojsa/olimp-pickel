-- Create shapes table
CREATE TABLE IF NOT EXISTS public.shapes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  calculation_type TEXT NOT NULL CHECK (calculation_type IN ('simple_formula', 'profile_table')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create standardized_profiles table
CREATE TABLE IF NOT EXISTS public.standardized_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shape_id UUID NOT NULL REFERENCES public.shapes(id) ON DELETE CASCADE,
  designation TEXT NOT NULL,
  kg_per_meter NUMERIC(10, 3) NOT NULL,
  dimensions JSONB, -- Store profile-specific dimensions (h, b, t, etc.)
  cross_sectional_area NUMERIC(10, 3), -- cm²
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(shape_id, designation)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_standardized_profiles_shape_id ON public.standardized_profiles(shape_id);
CREATE INDEX IF NOT EXISTS idx_standardized_profiles_designation ON public.standardized_profiles(designation);

-- Enable RLS
ALTER TABLE public.shapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standardized_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for now, similar to materials_library)
CREATE POLICY "Allow all operations on shapes" ON public.shapes
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on standardized_profiles" ON public.standardized_profiles
  FOR ALL USING (true) WITH CHECK (true);

-- Insert default simple shapes
INSERT INTO public.shapes (name, calculation_type, description) VALUES
  ('Round bar', 'simple_formula', 'Circular cross-section bar'),
  ('Rectangular bar', 'simple_formula', 'Rectangular cross-section bar'),
  ('Square bar', 'simple_formula', 'Square cross-section bar'),
  ('Hex bar', 'simple_formula', 'Hexagonal cross-section bar'),
  ('Round tube', 'simple_formula', 'Circular hollow tube'),
  ('Rectangular tube', 'simple_formula', 'Rectangular hollow tube'),
  ('Square tube', 'simple_formula', 'Square hollow tube'),
  ('Sheet', 'simple_formula', 'Flat sheet material'),
  ('Angle', 'profile_table', 'L-shaped steel angle profiles'),
  ('UPN', 'profile_table', 'European standard channel profiles'),
  ('HEA', 'profile_table', 'European standard I-beam profiles (HEA series)'),
  ('HEB', 'profile_table', 'European standard I-beam profiles (HEB series)')
ON CONFLICT (name) DO NOTHING;



