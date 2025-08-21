-- Add new fields to inventory table for parts
ALTER TABLE public.inventory 
ADD COLUMN materials_used JSONB,
ADD COLUMN tools_used JSONB,
ADD COLUMN drawings_files JSONB;

-- Update the comment to document the new fields
COMMENT ON COLUMN public.inventory.materials_used IS 'JSON array of materials used for this part';
COMMENT ON COLUMN public.inventory.tools_used IS 'JSON array of tools used for this part'; 
COMMENT ON COLUMN public.inventory.drawings_files IS 'JSON array of uploaded files (drawings, docs) with metadata';

-- Create a storage bucket for part files if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('part-files', 'part-files', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for part files
CREATE POLICY "Part files are publicly accessible"
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'part-files');

CREATE POLICY "Anyone can upload part files"
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'part-files');

CREATE POLICY "Anyone can update part files"
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'part-files');

CREATE POLICY "Anyone can delete part files"
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'part-files');