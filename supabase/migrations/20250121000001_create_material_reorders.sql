-- Create material_reorders table
CREATE TABLE IF NOT EXISTS material_reorders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  length_mm NUMERIC NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id)
);

-- Create index for faster queries
CREATE INDEX idx_material_reorders_inventory_id ON material_reorders(inventory_id);
CREATE INDEX idx_material_reorders_status ON material_reorders(status);
CREATE INDEX idx_material_reorders_created_at ON material_reorders(created_at DESC);

-- Enable Row Level Security
ALTER TABLE material_reorders ENABLE ROW LEVEL SECURITY;

-- Create policies for material_reorders
CREATE POLICY "Users can view material reorders" ON material_reorders
  FOR SELECT USING (true);

CREATE POLICY "Users can insert material reorders" ON material_reorders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update material reorders" ON material_reorders
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete material reorders" ON material_reorders
  FOR DELETE USING (true);
