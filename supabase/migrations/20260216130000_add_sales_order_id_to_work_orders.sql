-- Add sales_order_id to work_orders to link work orders created from sales order confirmation
ALTER TABLE public.work_orders
ADD COLUMN sales_order_id UUID REFERENCES public.sales_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_sales_order_id ON public.work_orders(sales_order_id);
