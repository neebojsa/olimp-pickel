-- Rename industry to customer_category and update existing data
ALTER TABLE public.customers
RENAME COLUMN industry TO customer_category;
