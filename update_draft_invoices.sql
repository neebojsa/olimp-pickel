-- Update existing draft invoices to pending status
-- Run this in your Supabase SQL Editor

-- Step 1: Update all draft invoices to pending
UPDATE invoices 
SET status = 'pending' 
WHERE status = 'draft';

-- Step 2: Verify the update
SELECT id, invoice_number, status, created_at 
FROM invoices 
WHERE status = 'pending' 
ORDER BY created_at DESC 
LIMIT 10;

-- Step 3: Check if any draft invoices remain
SELECT COUNT(*) as remaining_drafts 
FROM invoices 
WHERE status = 'draft';








