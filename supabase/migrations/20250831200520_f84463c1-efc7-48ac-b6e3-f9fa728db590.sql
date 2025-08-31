-- Add country and currency columns to suppliers table
ALTER TABLE public.suppliers ADD COLUMN country text;
ALTER TABLE public.suppliers ADD COLUMN currency text DEFAULT 'EUR';