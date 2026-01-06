# Supabase SQL Queries for Materials Library

## 1. Check All Materials in Database
```sql
SELECT * FROM materials_library 
ORDER BY material_type, grade;
```

## 2. Check Recent Materials (Last 10)
```sql
SELECT * FROM materials_library 
ORDER BY created_at DESC 
LIMIT 10;
```

## 3. Test Insert a New Material (Run this in Supabase SQL Editor)
```sql
INSERT INTO materials_library (grade, material_type, material_number, description, density)
VALUES ('TEST123', 'Steel', '1.9999', 'Test material for debugging', 7.85)
RETURNING *;
```

## 4. Check if Material Grade Already Exists
```sql
SELECT * FROM materials_library 
WHERE grade = 'YOUR_GRADE_HERE';
```

## 5. Check Table Structure
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'materials_library'
ORDER BY ordinal_position;
```

## 6. Check Row Level Security (RLS) Policies
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

## 6a. FIX RLS Policy - Allow All Operations (Run this to fix the insert issue)
```sql
-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all operations on materials_library" ON materials_library;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON materials_library;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON materials_library;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON materials_library;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON materials_library;

-- Create policies to allow all operations for authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON materials_library
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
```

## 6b. Alternative: Allow Public Access (Less secure, but simpler)
```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Allow all operations on materials_library" ON materials_library;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON materials_library;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON materials_library;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON materials_library;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON materials_library;

-- Allow all operations for everyone (use with caution)
CREATE POLICY "Allow all operations" ON materials_library
    FOR ALL
    USING (true)
    WITH CHECK (true);
```

## 7. Count Materials by Type
```sql
SELECT material_type, COUNT(*) as count
FROM materials_library
GROUP BY material_type
ORDER BY count DESC;
```

## 8. Delete Test Material (if needed)
```sql
DELETE FROM materials_library 
WHERE grade = 'TEST123';
```

## 9. Check for Duplicate Grades
```sql
SELECT grade, COUNT(*) as count
FROM materials_library
GROUP BY grade
HAVING COUNT(*) > 1;
```

## 10. View All Constraints on Table
```sql
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'materials_library';
```

## How to Use:
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste any query above
4. Replace placeholders (like 'YOUR_GRADE_HERE') with actual values
5. Click "Run" to execute

## Troubleshooting:
- If insert fails, check RLS policies (Query #6)
- If data exists but doesn't show in app, check Query #1 to verify it's in the database
- If you get "duplicate key" error, check Query #9 for duplicates
- If insert works in SQL but not in app, it's likely an RLS policy issue

