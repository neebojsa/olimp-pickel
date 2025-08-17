-- Create storage bucket for inventory photos
INSERT INTO storage.buckets (id, name, public) VALUES ('inventory-photos', 'inventory-photos', true);

-- Create RLS policies for inventory photos
CREATE POLICY "Anyone can view inventory photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'inventory-photos');

CREATE POLICY "Anyone can upload inventory photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'inventory-photos');

CREATE POLICY "Anyone can update inventory photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'inventory-photos');

CREATE POLICY "Anyone can delete inventory photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'inventory-photos');

-- Add photo_url column to inventory table
ALTER TABLE inventory ADD COLUMN photo_url TEXT;