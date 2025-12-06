-- Rename due_date_days column to payment_terms in customers table
ALTER TABLE public.customers 
RENAME COLUMN due_date_days TO payment_terms;

