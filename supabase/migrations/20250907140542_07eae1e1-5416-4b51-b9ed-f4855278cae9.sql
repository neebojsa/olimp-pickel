-- Add unit field to inventory table with default value "piece"
ALTER TABLE public.inventory ADD COLUMN unit text NOT NULL DEFAULT 'piece';

-- Update existing records to have "piece" as unit
UPDATE public.inventory SET unit = 'piece' WHERE unit IS NULL;