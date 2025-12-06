-- Run this SQL in your Supabase SQL Editor
-- Go to: Supabase Dashboard > SQL Editor > New Query
-- Copy and paste this entire file, then click "Run"

-- Add invoice_note field to invoice_settings table
ALTER TABLE public.invoice_settings 
ADD COLUMN IF NOT EXISTS invoice_note TEXT;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'invoice_settings' 
AND column_name = 'invoice_note';


