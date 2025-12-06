-- Add invoice_note field to invoice_settings table
ALTER TABLE public.invoice_settings 
ADD COLUMN IF NOT EXISTS invoice_note TEXT;


