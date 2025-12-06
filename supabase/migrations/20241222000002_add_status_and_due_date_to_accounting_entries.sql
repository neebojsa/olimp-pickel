-- Add status and due_date columns to accounting_entries table
ALTER TABLE public.accounting_entries 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS due_date DATE;



