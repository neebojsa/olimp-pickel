-- Add minimum stock threshold field to inventory table
ALTER TABLE public.inventory 
ADD COLUMN minimum_stock INTEGER DEFAULT 0;