-- Add customer_id field to inventory table
ALTER TABLE public.inventory 
ADD COLUMN customer_id uuid REFERENCES public.customers(id);