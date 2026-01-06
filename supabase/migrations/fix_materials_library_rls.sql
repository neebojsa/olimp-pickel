-- Fix RLS policies for materials_library table
-- This allows authenticated users to perform all operations (SELECT, INSERT, UPDATE, DELETE)

-- First, drop any existing policies that might conflict
DROP POLICY IF EXISTS "Allow all operations on materials_library" ON materials_library;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON materials_library;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON materials_library;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON materials_library;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON materials_library;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON materials_library;
DROP POLICY IF EXISTS "Allow all operations" ON materials_library;

-- Create a comprehensive policy that allows all operations for authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON materials_library
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Verify RLS is enabled (it should be)
ALTER TABLE materials_library ENABLE ROW LEVEL SECURITY;




