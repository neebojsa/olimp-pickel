-- Add document_url column to accounting_entries table
ALTER TABLE public.accounting_entries 
ADD COLUMN IF NOT EXISTS document_url TEXT;

