-- Payment Status Migration for CNC Craft Cycle
-- Run this in your Supabase SQL Editor

-- Step 1: Add the paid_date field to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_date DATE;

-- Step 2: Add a comment to explain the field
COMMENT ON COLUMN invoices.paid_date IS 'Date when the invoice was marked as paid. NULL means unpaid.';

-- Step 3: Verify the field was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'invoices' AND column_name = 'paid_date';

-- Step 4: Test the field by checking if we can select it
SELECT id, invoice_number, paid_date, status 
FROM invoices 
LIMIT 5;








