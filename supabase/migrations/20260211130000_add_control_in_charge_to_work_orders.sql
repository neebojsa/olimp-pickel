-- Add control_in_charge_id to work_orders (staff member in charge of control/QC)
ALTER TABLE public.work_orders
ADD COLUMN IF NOT EXISTS control_in_charge_id uuid REFERENCES public.staff(id);
