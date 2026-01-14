-- Add VAT rate column to customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) DEFAULT 17;















