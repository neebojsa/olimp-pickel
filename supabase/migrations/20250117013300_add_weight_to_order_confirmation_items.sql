-- Add weight column to order_confirmation_items for auto weight calculations
ALTER TABLE public.order_confirmation_items
ADD COLUMN IF NOT EXISTS weight DECIMAL(10,2) DEFAULT 0;













