-- Add production_status column to inventory table
ALTER TABLE public.inventory 
ADD COLUMN production_status TEXT;