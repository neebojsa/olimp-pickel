-- Add components_used JSONB column to inventory table for parts
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS components_used JSONB;

COMMENT ON COLUMN public.inventory.components_used IS 'JSON array of components used for this part';

