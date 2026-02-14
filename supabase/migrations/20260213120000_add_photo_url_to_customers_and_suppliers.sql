-- Add photo_url column to customers and suppliers tables
ALTER TABLE customers ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Create storage bucket for customer photos
INSERT INTO storage.buckets (id, name, public) VALUES ('customer-photos', 'customer-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for supplier photos
INSERT INTO storage.buckets (id, name, public) VALUES ('supplier-photos', 'supplier-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for customer photos
DROP POLICY IF EXISTS "Anyone can view customer photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload customer photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update customer photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete customer photos" ON storage.objects;
CREATE POLICY "Anyone can view customer photos" ON storage.objects FOR SELECT USING (bucket_id = 'customer-photos');
CREATE POLICY "Anyone can upload customer photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'customer-photos');
CREATE POLICY "Anyone can update customer photos" ON storage.objects FOR UPDATE USING (bucket_id = 'customer-photos');
CREATE POLICY "Anyone can delete customer photos" ON storage.objects FOR DELETE USING (bucket_id = 'customer-photos');

-- RLS policies for supplier photos
DROP POLICY IF EXISTS "Anyone can view supplier photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload supplier photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update supplier photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete supplier photos" ON storage.objects;
CREATE POLICY "Anyone can view supplier photos" ON storage.objects FOR SELECT USING (bucket_id = 'supplier-photos');
CREATE POLICY "Anyone can upload supplier photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'supplier-photos');
CREATE POLICY "Anyone can update supplier photos" ON storage.objects FOR UPDATE USING (bucket_id = 'supplier-photos');
CREATE POLICY "Anyone can delete supplier photos" ON storage.objects FOR DELETE USING (bucket_id = 'supplier-photos');
