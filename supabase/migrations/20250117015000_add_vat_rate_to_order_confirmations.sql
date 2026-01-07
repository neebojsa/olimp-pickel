-- Add VAT rate column to order_confirmations
ALTER TABLE public.order_confirmations
ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) DEFAULT 17;












