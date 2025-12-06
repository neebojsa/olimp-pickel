-- Add signatory column to invoice_settings table
ALTER TABLE public.invoice_settings 
ADD COLUMN IF NOT EXISTS signatory TEXT;


