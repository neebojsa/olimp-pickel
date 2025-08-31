-- Add currency column to inventory table for parts pricing
ALTER TABLE public.inventory 
ADD COLUMN currency text DEFAULT 'EUR';