-- Simple SQL script to add paid_date field to invoices table
-- Run this in your Supabase SQL editor or database management tool

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_date DATE;

-- Add comment to explain the field
COMMENT ON COLUMN invoices.paid_date IS 'Date when the invoice was marked as paid. NULL means unpaid.';








