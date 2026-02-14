-- Add setup_instructions, quality_requirements, production_notes to work_orders
ALTER TABLE public.work_orders
ADD COLUMN IF NOT EXISTS setup_instructions text,
ADD COLUMN IF NOT EXISTS quality_requirements text,
ADD COLUMN IF NOT EXISTS production_notes text;

-- Add tools_used, components_used, materials_used (work-order-specific, beyond part presets)
ALTER TABLE public.work_orders
ADD COLUMN IF NOT EXISTS tools_used jsonb,
ADD COLUMN IF NOT EXISTS components_used jsonb,
ADD COLUMN IF NOT EXISTS materials_used jsonb;

-- Add quantity (work order quantity in pcs) and operators_and_machines (JSONB array)
ALTER TABLE public.work_orders
ADD COLUMN IF NOT EXISTS quantity integer,
ADD COLUMN IF NOT EXISTS operators_and_machines jsonb;
