-- Add inventory_id column to invoice_items table to properly link items to inventory
-- This allows correct part number display when multiple items have the same name

ALTER TABLE invoice_items ADD COLUMN inventory_id UUID REFERENCES inventory(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_invoice_items_inventory_id ON invoice_items(inventory_id);

