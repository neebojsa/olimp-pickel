-- Add due_date_days column to customers table
ALTER TABLE public.customers 
ADD COLUMN due_date_days INTEGER;

