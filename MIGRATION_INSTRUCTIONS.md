# Migration Instructions: Add part_number and photo_url to order_confirmation_items

## Problem
Order Confirmations are not displaying part numbers and photos because the columns don't exist in the database.

## Solution
Run the following SQL migration in your Supabase SQL Editor:

### Steps:
1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the SQL below
4. Click "Run"

### SQL Migration:
```sql
ALTER TABLE public.order_confirmation_items
ADD COLUMN IF NOT EXISTS part_number TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT;
```

### After Running Migration:
1. Refresh your browser/app
2. Create a NEW Order Confirmation (old ones won't have part_number/photo_url saved)
3. The part number and photo should now be saved and displayed correctly

### Note:
- Existing Order Confirmations created before the migration will not have part_number/photo_url saved
- They will still try to display from inventory lookup, but it's better to create new ones after the migration






