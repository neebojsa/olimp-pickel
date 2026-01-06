-- Add contact_person_reference field to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS contact_person_reference TEXT;




