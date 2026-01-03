-- Fix RLS policies for order_confirmations to allow inserts
-- Use the same pattern as delivery_notes and other tables
DROP POLICY IF EXISTS "Enable all operations for authenticated users on order_confirmations" ON public.order_confirmations;

CREATE POLICY "Enable all operations for everyone" 
ON public.order_confirmations 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Fix RLS policies for order_confirmation_items to allow inserts
DROP POLICY IF EXISTS "Enable all operations for authenticated users on order_confirmation_items" ON public.order_confirmation_items;

CREATE POLICY "Enable all operations for everyone" 
ON public.order_confirmation_items 
FOR ALL 
USING (true) 
WITH CHECK (true);

