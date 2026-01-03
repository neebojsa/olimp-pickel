-- Create order_confirmations table
CREATE TABLE IF NOT EXISTS public.order_confirmations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_confirmation_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id),
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  shipping_date DATE,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  order_number TEXT,
  shipping_address TEXT,
  packing INTEGER DEFAULT 0,
  tara_weight DECIMAL(10,2) DEFAULT 0,
  total_quantity INTEGER DEFAULT 0,
  net_weight DECIMAL(10,2) DEFAULT 0,
  total_weight DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  vat_rate DECIMAL(5,2) DEFAULT 17,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_confirmation_items table
CREATE TABLE IF NOT EXISTS public.order_confirmation_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_confirmation_id UUID REFERENCES public.order_confirmations(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.inventory(id),
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  weight DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.order_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_confirmation_items ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (same pattern as delivery_notes and other tables)
CREATE POLICY "Enable all operations for everyone" 
ON public.order_confirmations 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Enable all operations for everyone" 
ON public.order_confirmation_items 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create function to generate order confirmation number in YY3-serial format
CREATE OR REPLACE FUNCTION generate_order_confirmation_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  serial_number INTEGER;
  new_number TEXT;
BEGIN
  -- Get current year in 2-digit format
  current_year := TO_CHAR(CURRENT_DATE, 'YY');

  -- Get the next serial number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_confirmation_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO serial_number
  FROM public.order_confirmations
  WHERE order_confirmation_number LIKE current_year || '3-%';

  -- Format the number as YY3-serial (e.g., 253-0001)
  new_number := current_year || '3-' || LPAD(serial_number::TEXT, 4, '0');

  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to order_confirmations table
CREATE TRIGGER update_order_confirmations_updated_at
  BEFORE UPDATE ON public.order_confirmations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_order_confirmations_customer_id ON public.order_confirmations(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_confirmations_status ON public.order_confirmations(status);
CREATE INDEX IF NOT EXISTS idx_order_confirmations_issue_date ON public.order_confirmations(issue_date);
CREATE INDEX IF NOT EXISTS idx_order_confirmation_items_order_confirmation_id ON public.order_confirmation_items(order_confirmation_id);
CREATE INDEX IF NOT EXISTS idx_order_confirmation_items_inventory_id ON public.order_confirmation_items(inventory_id);
