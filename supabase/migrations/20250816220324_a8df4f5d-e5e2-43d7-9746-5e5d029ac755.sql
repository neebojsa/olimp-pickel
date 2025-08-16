-- Add new fields to invoices table for comprehensive invoicing
ALTER TABLE invoices ADD COLUMN order_number TEXT;
ALTER TABLE invoices ADD COLUMN shipping_date DATE;
ALTER TABLE invoices ADD COLUMN shipping_address TEXT;
ALTER TABLE invoices ADD COLUMN incoterms TEXT CHECK (incoterms IN ('EXW', 'DAP', 'FCO'));
ALTER TABLE invoices ADD COLUMN declaration_number TEXT;
ALTER TABLE invoices ADD COLUMN packing INTEGER DEFAULT 0;
ALTER TABLE invoices ADD COLUMN tara_weight DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN total_quantity INTEGER DEFAULT 0;
ALTER TABLE invoices ADD COLUMN net_weight DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN total_weight DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN currency TEXT DEFAULT 'EUR';
ALTER TABLE invoices ADD COLUMN vat_rate DECIMAL(5,2) DEFAULT 0;

-- Add country and declaration numbers to customers table
ALTER TABLE customers ADD COLUMN country TEXT;
ALTER TABLE customers ADD COLUMN declaration_numbers TEXT[]; -- Array of declaration numbers

-- Create proper foreign key relationship for invoice_items if not exists
ALTER TABLE invoice_items ADD CONSTRAINT fk_invoice_items_invoice 
FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;

-- Add weight field to inventory for calculations
ALTER TABLE inventory ADD COLUMN weight DECIMAL(10,2) DEFAULT 0;

-- Create function to generate invoice numbers in format YY1-XX
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    sequence_num TEXT;
    max_sequence INTEGER;
BEGIN
    -- Get last two digits of current year
    current_year := RIGHT(EXTRACT(YEAR FROM CURRENT_DATE)::TEXT, 2);
    
    -- Get the maximum sequence number for this year
    SELECT COALESCE(MAX(
        CAST(RIGHT(invoice_number, 2) AS INTEGER)
    ), 0) INTO max_sequence
    FROM invoices 
    WHERE invoice_number LIKE current_year || '1-%';
    
    -- Increment and format as two digits
    sequence_num := LPAD((max_sequence + 1)::TEXT, 2, '0');
    
    -- Return formatted invoice number
    RETURN current_year || '1-' || sequence_num;
END;
$$ LANGUAGE plpgsql;