-- Update RLS policies for company_info table to allow public access
DROP POLICY IF EXISTS "Authenticated users can insert company info" ON company_info;
DROP POLICY IF EXISTS "Authenticated users can update company info" ON company_info;

-- Create new policies that allow public access
CREATE POLICY "Anyone can insert company info" 
ON company_info 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update company info" 
ON company_info 
FOR UPDATE 
USING (true);