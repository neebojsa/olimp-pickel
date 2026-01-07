-- Create delivery_notes table
CREATE TABLE IF NOT EXISTS public.delivery_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_note_number TEXT NOT NULL UNIQUE,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  to_type TEXT NOT NULL CHECK (to_type IN ('customer', 'supplier')),
  to_id UUID NOT NULL,
  delivery_address TEXT NOT NULL,
  packing_number INTEGER DEFAULT 0,
  packing_type TEXT CHECK (packing_type IN ('paketi', 'palete', 'koleta')),
  tara_weight DECIMAL(10,2) DEFAULT 0,
  total_weight DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  custom_columns JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create delivery_note_items table
CREATE TABLE IF NOT EXISTS public.delivery_note_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_note_id UUID NOT NULL REFERENCES public.delivery_notes(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.inventory(id),
  part_name TEXT NOT NULL,
  part_number TEXT,
  unit TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  weight DECIMAL(10,2) DEFAULT 0,
  material TEXT,
  request TEXT,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_note_items ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since no auth is implemented yet)
CREATE POLICY "Enable all operations for everyone" 
ON public.delivery_notes 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Enable all operations for everyone" 
ON public.delivery_note_items 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_delivery_notes_updated_at
BEFORE UPDATE ON public.delivery_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate delivery note numbers in format YY9-XX
CREATE OR REPLACE FUNCTION generate_delivery_note_number()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    sequence_num TEXT;
    max_sequence INTEGER;
    january_first DATE;
BEGIN
    -- Get last two digits of current year
    current_year := RIGHT(EXTRACT(YEAR FROM CURRENT_DATE)::TEXT, 2);
    
    -- Calculate January 1st of current year
    january_first := DATE(EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-01-01');
    
    -- Get the maximum sequence number for this year (only count notes created on or after Jan 1)
    SELECT COALESCE(MAX(
        CAST(RIGHT(delivery_note_number, 2) AS INTEGER)
    ), 0) INTO max_sequence
    FROM delivery_notes 
    WHERE delivery_note_number LIKE current_year || '9-%'
      AND issue_date >= january_first;
    
    -- Increment and format as two digits
    sequence_num := LPAD((max_sequence + 1)::TEXT, 2, '0');
    
    -- Return formatted delivery note number
    RETURN current_year || '9-' || sequence_num;
END;
$$ LANGUAGE plpgsql;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_delivery_notes_to_id ON public.delivery_notes(to_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_issue_date ON public.delivery_notes(issue_date);
CREATE INDEX IF NOT EXISTS idx_delivery_note_items_delivery_note_id ON public.delivery_note_items(delivery_note_id);












