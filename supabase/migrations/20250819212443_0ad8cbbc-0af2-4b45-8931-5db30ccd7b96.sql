-- Update existing work orders to have proper work order numbers
UPDATE work_orders 
SET work_order_number = (
  SELECT generate_work_order_number()
)
WHERE work_order_number IS NULL;