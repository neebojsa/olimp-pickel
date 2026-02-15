-- Add document_size_bytes column to accounting_entries for displaying file size in cost entries list
ALTER TABLE public.accounting_entries 
ADD COLUMN IF NOT EXISTS document_size_bytes BIGINT;
