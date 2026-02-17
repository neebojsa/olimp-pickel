-- Add invoice_type column to invoices table
-- 'invoice' = regular invoice, 'proforma' = proforma invoice
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS invoice_type TEXT NOT NULL DEFAULT 'invoice';

-- Add check constraint for valid values (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_invoice_type_check'
  ) THEN
    ALTER TABLE public.invoices
    ADD CONSTRAINT invoices_invoice_type_check 
    CHECK (invoice_type IN ('invoice', 'proforma'));
  END IF;
END $$;
