-- Create function to generate proforma invoice numbers in format YY2-XX
-- (distinct from regular invoices which use YY1-XX)
CREATE OR REPLACE FUNCTION public.generate_proforma_invoice_number()
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
    current_year := RIGHT(EXTRACT(YEAR FROM CURRENT_DATE)::TEXT, 2);
    
    SELECT COALESCE(MAX(
        CAST(RIGHT(invoice_number, 2) AS INTEGER)
    ), 0) INTO max_sequence
    FROM invoices 
    WHERE invoice_number LIKE current_year || '2-%'
    AND invoice_type = 'proforma';
    
    sequence_num := LPAD((max_sequence + 1)::TEXT, 2, '0');
    
    RETURN current_year || '2-' || sequence_num;
END;
$function$;
