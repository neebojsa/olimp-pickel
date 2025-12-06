-- Create storage bucket for cost documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cost-documents', 'cost-documents', true);

-- Set up RLS policies for the storage bucket
CREATE POLICY "Allow authenticated users to upload cost documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'cost-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view cost documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'cost-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update cost documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'cost-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete cost documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'cost-documents' AND auth.role() = 'authenticated');
