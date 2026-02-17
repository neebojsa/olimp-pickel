-- Add po_date to work_orders (date customer placed the order, from sales order or manual entry)
ALTER TABLE public.work_orders
ADD COLUMN po_date DATE NULL;
