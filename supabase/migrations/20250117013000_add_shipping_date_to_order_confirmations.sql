-- Add optional shipping_date to order_confirmations
ALTER TABLE public.order_confirmations
ADD COLUMN IF NOT EXISTS shipping_date DATE;















