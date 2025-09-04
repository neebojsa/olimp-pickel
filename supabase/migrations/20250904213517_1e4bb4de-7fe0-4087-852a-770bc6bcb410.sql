-- Create bucket for tool category images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tool-category-images', 'tool-category-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for tool category images that work with the staff session system
CREATE POLICY "Anyone can upload tool category images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'tool-category-images');

CREATE POLICY "Anyone can view tool category images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'tool-category-images');

CREATE POLICY "Anyone can update tool category images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'tool-category-images');

CREATE POLICY "Anyone can delete tool category images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'tool-category-images');