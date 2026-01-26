-- Create material_adjustments table
CREATE TABLE IF NOT EXISTS material_adjustments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('add', 'subtract')),
  length_mm NUMERIC NOT NULL,
  quantity_pieces INTEGER NOT NULL DEFAULT 1,
  supplier_id UUID REFERENCES suppliers(id),
  unit_price NUMERIC,
  price_unit TEXT CHECK (price_unit IN ('per_kg', 'per_meter')),
  location TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- Create index for faster queries
CREATE INDEX idx_material_adjustments_inventory_id ON material_adjustments(inventory_id);
CREATE INDEX idx_material_adjustments_created_at ON material_adjustments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE material_adjustments ENABLE ROW LEVEL SECURITY;

-- Create policies for material_adjustments
CREATE POLICY "Users can view material adjustments" ON material_adjustments
  FOR SELECT USING (true);

CREATE POLICY "Users can insert material adjustments" ON material_adjustments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own material adjustments" ON material_adjustments
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own material adjustments" ON material_adjustments
  FOR DELETE USING (created_by = auth.uid());
