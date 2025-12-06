-- Add signature_person field to invoices table
-- Run this SQL command in your Supabase SQL editor or database console

ALTER TABLE invoices ADD COLUMN signature_person TEXT;

-- Add comment to document the purpose
COMMENT ON COLUMN invoices.signature_person IS 'Name of person responsible for creating/signing the invoice';














