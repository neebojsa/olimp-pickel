-- Add po_date to sales_orders (date customer placed the order)
ALTER TABLE public.sales_orders
ADD COLUMN po_date DATE NULL;
