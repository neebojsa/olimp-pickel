-- Remove obsolete due_date column; shipping_date is used instead
ALTER TABLE public.order_confirmations
DROP COLUMN IF EXISTS due_date;















