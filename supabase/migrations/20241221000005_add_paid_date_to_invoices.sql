-- Add paid_date field to invoices table to track when invoice was marked as paid
ALTER TABLE invoices ADD COLUMN paid_date DATE;

-- Create function to automatically calculate payment status based on due date and paid status
CREATE OR REPLACE FUNCTION calculate_invoice_payment_status(invoice_row invoices)
RETURNS TEXT AS $$
BEGIN
  -- If invoice has a paid_date, it's paid
  IF invoice_row.paid_date IS NOT NULL THEN
    RETURN 'paid';
  END IF;
  
  -- If no due_date, consider it pending
  IF invoice_row.due_date IS NULL THEN
    RETURN 'pending';
  END IF;
  
  -- Calculate due date from issue_date + payment_terms if due_date is not set
  DECLARE
    calculated_due_date DATE;
    customer_payment_terms INTEGER;
  BEGIN
    -- Get customer payment terms
    SELECT payment_terms INTO customer_payment_terms 
    FROM customers 
    WHERE id = invoice_row.customer_id;
    
    -- Calculate due date
    IF invoice_row.due_date IS NOT NULL THEN
      calculated_due_date := invoice_row.due_date;
    ELSIF customer_payment_terms IS NOT NULL THEN
      calculated_due_date := invoice_row.issue_date + INTERVAL '1 day' * customer_payment_terms;
    ELSE
      calculated_due_date := invoice_row.issue_date + INTERVAL '30 days'; -- Default 30 days
    END IF;
    
    -- Compare with current date
    IF calculated_due_date < CURRENT_DATE THEN
      RETURN 'overdue';
    ELSE
      RETURN 'pending';
    END IF;
  END;
END;
$$ LANGUAGE plpgsql;

-- Create a view that includes the calculated payment status
CREATE OR REPLACE VIEW invoices_with_payment_status AS
SELECT 
  i.*,
  calculate_invoice_payment_status(i.*) as payment_status
FROM invoices i;

-- Add comment to explain the paid_date field
COMMENT ON COLUMN invoices.paid_date IS 'Date when the invoice was marked as paid. NULL means unpaid.';








