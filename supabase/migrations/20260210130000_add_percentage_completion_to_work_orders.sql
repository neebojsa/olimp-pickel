-- Add percentage_completion to work_orders (0-100, default 0)
ALTER TABLE public.work_orders
ADD COLUMN IF NOT EXISTS percentage_completion integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.work_orders.percentage_completion IS 'Completion percentage 0-100, rounded to 10 in UI';
