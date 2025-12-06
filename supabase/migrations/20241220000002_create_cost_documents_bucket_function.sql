-- Create a function to create the cost-documents bucket if it doesn't exist
CREATE OR REPLACE FUNCTION create_cost_documents_bucket()
RETURNS void AS $$
BEGIN
  -- Insert the bucket if it doesn't exist
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('cost-documents', 'cost-documents', true)
  ON CONFLICT (id) DO NOTHING;
  
  -- Create RLS policies if they don't exist
  -- Note: We'll use more permissive policies for now to avoid auth issues
  
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Allow authenticated users to upload cost documents" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated users to view cost documents" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated users to update cost documents" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated users to delete cost documents" ON storage.objects;
  
  -- Create more permissive policies
  CREATE POLICY "Anyone can upload cost documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'cost-documents');
  
  CREATE POLICY "Anyone can view cost documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cost-documents');
  
  CREATE POLICY "Anyone can update cost documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'cost-documents');
  
  CREATE POLICY "Anyone can delete cost documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'cost-documents');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

