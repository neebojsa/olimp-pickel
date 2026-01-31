-- Add created_by_staff_id column to inventory table to track who created each item
ALTER TABLE public.inventory 
ADD COLUMN created_by_staff_id UUID REFERENCES public.staff(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_inventory_created_by_staff_id ON public.inventory(created_by_staff_id);

-- Add comment to document the column
COMMENT ON COLUMN public.inventory.created_by_staff_id IS 'References the staff member who created this inventory item';
