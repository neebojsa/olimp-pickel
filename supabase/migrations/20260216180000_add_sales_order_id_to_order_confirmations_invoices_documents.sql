-- Add sales_order_id to order_confirmations for tracking OC generated from SO
ALTER TABLE public.order_confirmations
ADD COLUMN IF NOT EXISTS sales_order_id UUID REFERENCES public.sales_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_order_confirmations_sales_order_id ON public.order_confirmations(sales_order_id);

-- Add sales_order_id to invoices for tracking invoice generated from SO
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS sales_order_id UUID REFERENCES public.sales_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_sales_order_id ON public.invoices(sales_order_id);

-- Add sales_order_id to documents for tracking BoM generated from SO
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS sales_order_id UUID REFERENCES public.sales_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_sales_order_id ON public.documents(sales_order_id);
