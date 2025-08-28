-- Add missing columns to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS contact_person text,
ADD COLUMN IF NOT EXISTS industry text,
ADD COLUMN IF NOT EXISTS webpage text;