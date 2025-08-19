-- Add columns to store part information in work orders
ALTER TABLE public.work_orders 
ADD COLUMN part_name TEXT,
ADD COLUMN part_number TEXT,
ADD COLUMN inventory_id UUID REFERENCES public.inventory(id);