-- Create invoice_settings table
CREATE TABLE public.invoice_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  primary_color TEXT NOT NULL DEFAULT '#3b82f6',
  domestic_footer_column1 TEXT,
  domestic_footer_column2 TEXT,
  domestic_footer_column3 TEXT,
  foreign_footer_column1 TEXT,
  foreign_footer_column2 TEXT,
  foreign_footer_column3 TEXT
);

-- Enable RLS
ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Invoice settings are viewable by everyone" 
ON public.invoice_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Invoice settings can be created by everyone" 
ON public.invoice_settings 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Invoice settings can be updated by everyone" 
ON public.invoice_settings 
FOR UPDATE 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_invoice_settings_updated_at
BEFORE UPDATE ON public.invoice_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();