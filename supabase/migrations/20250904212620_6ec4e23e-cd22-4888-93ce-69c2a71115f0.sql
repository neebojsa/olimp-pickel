-- Fix RLS policies for tool_category_hierarchy table
DROP POLICY IF EXISTS "Authenticated users can create tool categories" ON public.tool_category_hierarchy;
DROP POLICY IF EXISTS "Authenticated users can view tool categories" ON public.tool_category_hierarchy;
DROP POLICY IF EXISTS "Authenticated users can update tool categories" ON public.tool_category_hierarchy;
DROP POLICY IF EXISTS "Authenticated users can delete tool categories" ON public.tool_category_hierarchy;

-- Create new policies that work with the staff session system
CREATE POLICY "Enable all operations for everyone on tool categories" 
ON public.tool_category_hierarchy FOR ALL 
USING (true) 
WITH CHECK (true);

-- Fix RLS policies for tool_spec_fields table
DROP POLICY IF EXISTS "Authenticated users can create spec fields" ON public.tool_spec_fields;
DROP POLICY IF EXISTS "Authenticated users can view spec fields" ON public.tool_spec_fields;
DROP POLICY IF EXISTS "Authenticated users can update spec fields" ON public.tool_spec_fields;
DROP POLICY IF EXISTS "Authenticated users can delete spec fields" ON public.tool_spec_fields;

-- Create new policies that work with the staff session system
CREATE POLICY "Enable all operations for everyone on spec fields" 
ON public.tool_spec_fields FOR ALL 
USING (true) 
WITH CHECK (true);