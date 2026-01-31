-- Add created_by_staff_id column to material_adjustments table to track who made each adjustment
ALTER TABLE public.material_adjustments 
ADD COLUMN created_by_staff_id UUID REFERENCES public.staff(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_material_adjustments_created_by_staff_id ON public.material_adjustments(created_by_staff_id);

-- Add comment to document the column
COMMENT ON COLUMN public.material_adjustments.created_by_staff_id IS 'References the staff member who created this material adjustment';
