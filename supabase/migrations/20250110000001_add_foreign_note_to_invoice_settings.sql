-- Add foreign_note column to invoice_settings table for foreign customer notes
ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS foreign_note TEXT;

