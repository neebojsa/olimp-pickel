-- Fix function search path security issues
-- Update existing functions to set secure search_path

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    current_year TEXT;
    sequence_num TEXT;
    max_sequence INTEGER;
BEGIN
    -- Get last two digits of current year
    current_year := RIGHT(EXTRACT(YEAR FROM CURRENT_DATE)::TEXT, 2);
    
    -- Get the maximum sequence number for this year
    SELECT COALESCE(MAX(
        CAST(RIGHT(invoice_number, 2) AS INTEGER)
    ), 0) INTO max_sequence
    FROM invoices 
    WHERE invoice_number LIKE current_year || '1-%';
    
    -- Increment and format as two digits
    sequence_num := LPAD((max_sequence + 1)::TEXT, 2, '0');
    
    -- Return formatted invoice number
    RETURN current_year || '1-' || sequence_num;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_work_order_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    current_year TEXT;
    sequence_num TEXT;
    max_sequence INTEGER;
BEGIN
    -- Get last two digits of current year
    current_year := RIGHT(EXTRACT(YEAR FROM CURRENT_DATE)::TEXT, 2);
    
    -- Get the maximum sequence number for this year (looking for pattern YY9-XX)
    SELECT COALESCE(MAX(
        CAST(RIGHT(work_order_number, 2) AS INTEGER)
    ), 0) INTO max_sequence
    FROM work_orders 
    WHERE work_order_number LIKE current_year || '9-%'
    AND work_order_number ~ '^[0-9]{2}9-[0-9]{2}$';
    
    -- Increment and format as two digits
    sequence_num := LPAD((max_sequence + 1)::TEXT, 2, '0');
    
    -- Return formatted work order number
    RETURN current_year || '9-' || sequence_num;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;