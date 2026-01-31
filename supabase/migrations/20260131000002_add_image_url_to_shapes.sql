-- Add image_url column to shapes table for storing uploaded shape images
ALTER TABLE public.shapes 
ADD COLUMN image_url TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_shapes_image_url ON public.shapes(image_url) WHERE image_url IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN public.shapes.image_url IS 'URL to the uploaded image for this material shape (stored in Supabase storage)';

-- Create storage bucket for shape images if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('shape-images', 'shape-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for shape images
-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view shape images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload shape images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update shape images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete shape images" ON storage.objects;

CREATE POLICY "Anyone can view shape images"
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'shape-images');

CREATE POLICY "Anyone can upload shape images"
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'shape-images');

CREATE POLICY "Anyone can update shape images"
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'shape-images');

CREATE POLICY "Anyone can delete shape images"
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'shape-images');
