-- Fix RLS policies for materials_library table
-- This app uses custom staff authentication, NOT Supabase auth
-- So we need policies that allow operations without checking auth.role()

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow all operations on materials_library" ON materials_library;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON materials_library;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON materials_library;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON materials_library;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON materials_library;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON materials_library;
DROP POLICY IF EXISTS "Allow all operations" ON materials_library;

-- Create policy that allows all operations for anon role (since app uses custom auth)
-- The app authenticates at application level, so Supabase client uses anon key
CREATE POLICY "Allow all operations for anon role" ON materials_library
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE materials_library ENABLE ROW LEVEL SECURITY;




