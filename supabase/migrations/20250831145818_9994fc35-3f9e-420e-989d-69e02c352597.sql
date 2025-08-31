-- Add currency column to customers table
ALTER TABLE customers ADD COLUMN currency text DEFAULT 'EUR';