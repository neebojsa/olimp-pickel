-- Add VAT number field to customers table
ALTER TABLE public.customers 
ADD COLUMN vat_number text;