-- Create sales_orders table
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sales_order_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  requested_delivery_date DATE NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'cancelled')),
  currency TEXT DEFAULT 'EUR',
  vat_rate NUMERIC DEFAULT 0,
  notes TEXT NULL,
  customer_po_number TEXT NULL,
  shipping_address TEXT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  total_quantity NUMERIC DEFAULT 0,
  packing INTEGER DEFAULT 0,
  tara_weight NUMERIC DEFAULT 0,
  net_weight NUMERIC DEFAULT 0,
  total_weight NUMERIC DEFAULT 0
);

-- Create sales_order_items table
CREATE TABLE IF NOT EXISTS public.sales_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0
);

-- Enable Row Level Security
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;

-- Create policies (same pattern as invoices/order_confirmations)
CREATE POLICY "Enable all operations for everyone"
ON public.sales_orders
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable all operations for everyone"
ON public.sales_order_items
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at (function already exists)
CREATE TRIGGER update_sales_orders_updated_at
  BEFORE UPDATE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate sales order number in YY2-XX format (consistent with invoice YY1-XX, delivery note YY9-XX)
CREATE OR REPLACE FUNCTION public.generate_sales_order_number()
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
    -- Get last two digits of current year
    current_year := RIGHT(EXTRACT(YEAR FROM CURRENT_DATE)::TEXT, 2);
    
    -- Get the maximum sequence number for this year (looking for pattern YY2-XX)
    SELECT COALESCE(MAX(
        CAST(RIGHT(sales_order_number, 2) AS INTEGER)
    ), 0) INTO max_sequence
    FROM sales_orders
    WHERE sales_order_number LIKE current_year || '2-%';
    
    -- Increment and format as two digits
    sequence_num := LPAD((max_sequence + 1)::TEXT, 2, '0');
    
    -- Return formatted sales order number (e.g., 262-01)
    RETURN current_year || '2-' || sequence_num;
END;
$function$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_id ON public.sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON public.sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_issue_date ON public.sales_orders(issue_date);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_sales_order_id ON public.sales_order_items(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_inventory_id ON public.sales_order_items(inventory_id);
