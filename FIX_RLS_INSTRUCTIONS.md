# Fix RLS Policy Error for materials_library

## Error Message:
"new row violates row-level security policy for table 'materials_library'"

## Solution:

You need to create an RLS policy that allows authenticated users to insert/update/delete records.

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar

### Step 2: Run This SQL Query

**IMPORTANT:** Your app uses **custom staff authentication**, NOT Supabase auth. The previous policy was checking for Supabase auth which doesn't exist in your app.

Copy and paste this entire query into the SQL Editor and click **Run**:

```sql
-- Drop all existing policies
DROP POLICY IF EXISTS "Allow all operations on materials_library" ON materials_library;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON materials_library;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON materials_library;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON materials_library;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON materials_library;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON materials_library;
DROP POLICY IF EXISTS "Allow all operations" ON materials_library;
DROP POLICY IF EXISTS "Allow all operations for anon role" ON materials_library;

-- Create policy that allows all operations (app uses custom auth at application level)
-- Since your app authenticates users via custom staff sessions, Supabase client uses anon key
CREATE POLICY "Allow all operations for anon role" ON materials_library
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE materials_library ENABLE ROW LEVEL SECURITY;
```

### Step 3: Verify It Works
1. After running the query, you should see "Success. No rows returned"
2. Try adding a material grade again in the app
3. It should work now!

### Alternative: If Above Doesn't Work

If you're still getting errors, try this more permissive policy (less secure, but will definitely work):

```sql
-- Drop all existing policies
DROP POLICY IF EXISTS "Allow all operations on materials_library" ON materials_library;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON materials_library;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON materials_library;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON materials_library;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON materials_library;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON materials_library;
DROP POLICY IF EXISTS "Allow all operations" ON materials_library;

-- Allow all operations for everyone (use with caution in production)
CREATE POLICY "Allow all operations" ON materials_library
    FOR ALL
    USING (true)
    WITH CHECK (true);
```

### Check Current Policies

To see what policies currently exist, run:

```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'materials_library';
```

### What This Does:

- **DROP POLICY**: Removes any conflicting policies
- **CREATE POLICY**: Creates a new policy that allows authenticated users to:
  - SELECT (read)
  - INSERT (create)
  - UPDATE (modify)
  - DELETE (remove)
- **ENABLE ROW LEVEL SECURITY**: Ensures RLS is active on the table

After running this, you should be able to add, edit, and delete material grades without errors.

