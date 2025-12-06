CREATE TABLE cost_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    supplier_name TEXT NOT NULL,
    subtotal_tax_excluded NUMERIC NOT NULL,
    total_amount NUMERIC NOT NULL,
    currency TEXT NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE,
    document_type TEXT NOT NULL, -- e.g., 'Invoice', 'Quote', 'Receipt', 'Other'
    document_number TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'paid', 'overdue'
    document_url TEXT, -- URL to the scanned document image
    extracted_data JSONB, -- Store raw OCR extracted data
    confidence_score NUMERIC -- Confidence of OCR extraction
);

-- Add indexes for performance
CREATE INDEX idx_cost_entries_supplier_id ON cost_entries(supplier_id);
CREATE INDEX idx_cost_entries_issue_date ON cost_entries(issue_date);
CREATE INDEX idx_cost_entries_status ON cost_entries(status);

-- Enable Row Level Security (RLS)
ALTER TABLE cost_entries ENABLE ROW LEVEL SECURITY;

-- Policies for RLS
CREATE POLICY "Allow authenticated users to view cost entries"
ON cost_entries FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert cost entries"
ON cost_entries FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update their cost entries"
ON cost_entries FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete their cost entries"
ON cost_entries FOR DELETE
USING (auth.role() = 'authenticated');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on each update
CREATE TRIGGER update_cost_entries_updated_at
BEFORE UPDATE ON cost_entries
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();