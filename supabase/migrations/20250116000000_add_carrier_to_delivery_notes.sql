-- Add carrier field to delivery_notes table
ALTER TABLE public.delivery_notes 
ADD COLUMN IF NOT EXISTS carrier TEXT;













