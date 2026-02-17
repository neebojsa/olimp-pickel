-- Add purchase_order_id to sales_orders to link SO to the PO that created it
ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_orders_purchase_order_id ON public.sales_orders(purchase_order_id);

-- Update purchase_orders status constraint: draft, confirmed, canceled (user-requested values)
-- First migrate existing 'cancelled' to 'canceled', then update constraint
UPDATE public.purchase_orders SET status = 'canceled' WHERE status = 'cancelled';

ALTER TABLE public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;
ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_status_check
  CHECK (status IN ('draft', 'confirmed', 'canceled'));
