-- Add payment_terms column to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS payment_terms INTEGER;

