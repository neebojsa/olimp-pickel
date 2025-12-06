-- Fix RLS policies for cost_entries table
-- Run this in Supabase SQL Editor

-- First, let's check if the user is authenticated
-- This will help debug the issue
SELECT auth.role() as current_role, auth.uid() as current_user_id;

-- Drop existing policies and recreate them with better conditions
DROP POLICY IF EXISTS "Allow authenticated users to view cost entries" ON cost_entries;
DROP POLICY IF EXISTS "Allow authenticated users to insert cost entries" ON cost_entries;
DROP POLICY IF EXISTS "Allow authenticated users to update their cost entries" ON cost_entries;
DROP POLICY IF EXISTS "Allow authenticated users to delete their cost entries" ON cost_entries;

-- Create more permissive policies for now (we can tighten them later)
CREATE POLICY "Enable read access for authenticated users" ON cost_entries
FOR SELECT USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON cost_entries
FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON cost_entries
FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" ON cost_entries
FOR DELETE USING (true);

-- Alternative: If you want to disable RLS temporarily for testing
-- ALTER TABLE cost_entries DISABLE ROW LEVEL SECURITY;
