-- Add DAP and FCO address fields to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS dap_address TEXT,
ADD COLUMN IF NOT EXISTS fco_address TEXT;


