-- Update nebojsa.k@olimp-cnc.com to have admin permissions
UPDATE staff 
SET 
  page_permissions = '["all"]'::jsonb,
  can_see_prices = true,
  can_see_customers = true
WHERE email = 'nebojsa.k@olimp-cnc.com';