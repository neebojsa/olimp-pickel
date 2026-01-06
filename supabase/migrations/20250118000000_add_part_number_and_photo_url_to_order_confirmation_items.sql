-- Add part_number and photo_url columns to order_confirmation_items table
ALTER TABLE public.order_confirmation_items
ADD COLUMN IF NOT EXISTS part_number TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT;






