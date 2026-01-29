-- Add dedupe_key column to inventory table for duplicate detection
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

-- Create function to generate dedupe key for Parts
CREATE OR REPLACE FUNCTION generate_parts_dedupe_key(
  p_name TEXT,
  p_part_number TEXT,
  p_description TEXT,
  p_customer_id UUID,
  p_unit_price DECIMAL,
  p_currency TEXT,
  p_weight DECIMAL,
  p_location TEXT,
  p_unit TEXT,
  p_minimum_stock INTEGER
) RETURNS TEXT AS $$
DECLARE
  normalized_name TEXT;
  normalized_part_number TEXT;
  normalized_description TEXT;
  normalized_location TEXT;
  normalized_unit TEXT;
  normalized_currency TEXT;
BEGIN
  -- Normalize text fields: trim whitespace, lowercase for comparison
  normalized_name := LOWER(TRIM(COALESCE(p_name, '')));
  normalized_part_number := LOWER(TRIM(COALESCE(p_part_number, '')));
  normalized_description := LOWER(TRIM(COALESCE(p_description, '')));
  normalized_location := LOWER(TRIM(COALESCE(p_location, '')));
  normalized_unit := LOWER(TRIM(COALESCE(p_unit, '')));
  normalized_currency := LOWER(TRIM(COALESCE(p_currency, '')));
  
  -- Normalize numeric values: round to 2 decimals for price, 3 for weight
  -- Convert NULL to empty string for consistent comparison
  RETURN encode(digest(
    normalized_name || '|' ||
    normalized_part_number || '|' ||
    normalized_description || '|' ||
    COALESCE(p_customer_id::TEXT, '') || '|' ||
    COALESCE(ROUND(p_unit_price::NUMERIC, 2)::TEXT, '0') || '|' ||
    normalized_currency || '|' ||
    COALESCE(ROUND(p_weight::NUMERIC, 3)::TEXT, '0') || '|' ||
    normalized_location || '|' ||
    normalized_unit || '|' ||
    COALESCE(p_minimum_stock::TEXT, '0'),
    'sha256'
  ), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to generate dedupe key for Materials
CREATE OR REPLACE FUNCTION generate_materials_dedupe_key(
  p_name TEXT,
  p_materials_used JSONB,
  p_description TEXT,
  p_location TEXT
) RETURNS TEXT AS $$
DECLARE
  normalized_name TEXT;
  normalized_description TEXT;
  normalized_location TEXT;
  materials_json TEXT;
BEGIN
  -- Normalize text fields
  normalized_name := LOWER(TRIM(COALESCE(p_name, '')));
  normalized_description := LOWER(TRIM(COALESCE(p_description, '')));
  normalized_location := LOWER(TRIM(COALESCE(p_location, '')));
  
  -- Normalize JSONB: sort keys and remove null values for consistent comparison
  materials_json := COALESCE(jsonb_pretty(p_materials_used), '{}');
  
  RETURN encode(digest(
    normalized_name || '|' ||
    materials_json || '|' ||
    normalized_description || '|' ||
    normalized_location,
    'sha256'
  ), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to check for duplicates
CREATE OR REPLACE FUNCTION check_inventory_duplicate(
  p_category TEXT,
  p_id UUID DEFAULT NULL, -- For updates, exclude this ID
  p_name TEXT DEFAULT NULL,
  p_part_number TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_unit_price DECIMAL DEFAULT NULL,
  p_currency TEXT DEFAULT NULL,
  p_weight DECIMAL DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_unit TEXT DEFAULT NULL,
  p_minimum_stock INTEGER DEFAULT NULL,
  p_materials_used JSONB DEFAULT NULL
) RETURNS TABLE(duplicate_id UUID, duplicate_name TEXT, duplicate_part_number TEXT, created_at TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
  v_dedupe_key TEXT;
BEGIN
  IF p_category = 'Parts' THEN
    v_dedupe_key := generate_parts_dedupe_key(
      p_name, p_part_number, p_description, p_customer_id,
      p_unit_price, p_currency, p_weight, p_location, p_unit, p_minimum_stock
    );
  ELSIF p_category = 'Materials' THEN
    v_dedupe_key := generate_materials_dedupe_key(
      p_name, p_materials_used, p_description, p_location
    );
  ELSE
    RETURN; -- Unknown category
  END IF;
  
  RETURN QUERY
  SELECT 
    i.id,
    i.name,
    i.part_number,
    i.created_at
  FROM public.inventory i
  WHERE i.category = p_category
    -- Match dedupe_key exactly OR match the base part (before any ID suffix)
    -- This handles both new items and existing duplicates that may have ID suffixes
    AND (
      i.dedupe_key = v_dedupe_key 
      OR i.dedupe_key LIKE v_dedupe_key || '|%'
    )
    AND (p_id IS NULL OR i.id != p_id) -- Exclude current item when updating
  ORDER BY i.created_at ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set dedupe_key on insert/update
-- Note: If dedupe_key already contains '|' (indicating it was manually made unique for duplicates),
-- we preserve it and don't recalculate
CREATE OR REPLACE FUNCTION set_inventory_dedupe_key()
RETURNS TRIGGER AS $$
BEGIN
  -- Only recalculate dedupe_key if it's NULL or doesn't contain '|' (not manually made unique)
  -- This preserves dedupe_keys that were manually modified to handle existing duplicates
  IF NEW.dedupe_key IS NULL OR NEW.dedupe_key NOT LIKE '%|%' THEN
    IF NEW.category = 'Parts' THEN
      NEW.dedupe_key := generate_parts_dedupe_key(
        NEW.name, NEW.part_number, NEW.description, NEW.customer_id,
        NEW.unit_price, NEW.currency, NEW.weight, NEW.location, NEW.unit, NEW.minimum_stock
      );
    ELSIF NEW.category = 'Materials' THEN
      NEW.dedupe_key := generate_materials_dedupe_key(
        NEW.name, NEW.materials_used, NEW.description, NEW.location
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_set_dedupe_key
  BEFORE INSERT OR UPDATE ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION set_inventory_dedupe_key();

-- Step 1: Update existing rows to have dedupe_key (without constraint first)
UPDATE public.inventory
SET dedupe_key = CASE
  WHEN category = 'Parts' THEN generate_parts_dedupe_key(
    name, part_number, description, customer_id,
    unit_price, currency, weight, location, unit, minimum_stock
  )
  WHEN category = 'Materials' THEN generate_materials_dedupe_key(
    name, materials_used, description, location
  )
  ELSE NULL
END
WHERE dedupe_key IS NULL;

-- Step 2: Handle existing duplicates by making them unique
-- For each duplicate group, keep the oldest row's dedupe_key unchanged,
-- and append the row ID to all others to make them unique
-- Temporarily disable the trigger to prevent it from recalculating dedupe_key
ALTER TABLE public.inventory DISABLE TRIGGER inventory_set_dedupe_key;

-- Use a single UPDATE with CTE to handle all duplicates atomically
WITH duplicate_rows AS (
  SELECT 
    id,
    dedupe_key,
    category,
    ROW_NUMBER() OVER (
      PARTITION BY dedupe_key, category 
      ORDER BY created_at ASC, id ASC
    ) as row_num
  FROM public.inventory
  WHERE dedupe_key IS NOT NULL
    AND (category = 'Parts' OR category = 'Materials')
),
rows_to_update AS (
  SELECT id, dedupe_key
  FROM duplicate_rows
  WHERE row_num > 1  -- All rows except the first (oldest) in each duplicate group
)
UPDATE public.inventory i
SET dedupe_key = rtu.dedupe_key || '|' || i.id::TEXT
FROM rows_to_update rtu
WHERE i.id = rtu.id;

-- Re-enable the trigger
ALTER TABLE public.inventory ENABLE TRIGGER inventory_set_dedupe_key;

-- Now create unique index on dedupe_key per category (allows same key in different categories)
-- This will prevent NEW duplicates from being created
CREATE UNIQUE INDEX IF NOT EXISTS inventory_dedupe_key_category_unique 
ON public.inventory (dedupe_key, category) 
WHERE dedupe_key IS NOT NULL;
