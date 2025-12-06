-- Add signature_person field to invoices table
ALTER TABLE invoices ADD COLUMN signature_person TEXT;

-- Add comment to document the purpose
COMMENT ON COLUMN invoices.signature_person IS 'Name of person responsible for creating/signing the invoice';














