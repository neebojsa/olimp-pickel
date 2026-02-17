-- Create purchase_orders table (same structure as sales_orders, no customer_po_number)
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  purchase_order_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  requested_delivery_date DATE NULL,
  po_date DATE NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'cancelled')),
  currency TEXT DEFAULT 'EUR',
  vat_rate NUMERIC DEFAULT 0,
  notes TEXT NULL,
  shipping_address TEXT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  total_quantity NUMERIC DEFAULT 0,
  packing INTEGER DEFAULT 0,
  tara_weight NUMERIC DEFAULT 0,
  net_weight NUMERIC DEFAULT 0,
  total_weight NUMERIC DEFAULT 0
);

-- Create purchase_order_items table
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0
);

-- Enable Row Level Security
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable all operations for everyone"
ON public.purchase_orders
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable all operations for everyone"
ON public.purchase_order_items
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate purchase order number (PO-YY-XX format, different from YY2-XX)
CREATE OR REPLACE FUNCTION public.generate_purchase_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    current_year TEXT;
    sequence_num TEXT;
    max_sequence INTEGER;
BEGIN
    current_year := RIGHT(EXTRACT(YEAR FROM CURRENT_DATE)::TEXT, 2);
    
    SELECT COALESCE(MAX(
        CAST(RIGHT(purchase_order_number, 2) AS INTEGER)
    ), 0) INTO max_sequence
    FROM purchase_orders
    WHERE purchase_order_number LIKE 'PO-' || current_year || '-%';
    
    sequence_num := LPAD((max_sequence + 1)::TEXT, 2, '0');
    
    RETURN 'PO-' || current_year || '-' || sequence_num;
END;
$function$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_purchase_orders_customer_id ON public.purchase_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_issue_date ON public.purchase_orders(issue_date);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_purchase_order_id ON public.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_inventory_id ON public.purchase_order_items(inventory_id);
