-- Create storage policies for company-assets bucket
CREATE POLICY "Allow public access to company assets" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'company-assets');

CREATE POLICY "Allow authenticated users to upload company assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'company-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update company assets" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'company-assets' AND auth.role() = 'authenticated');