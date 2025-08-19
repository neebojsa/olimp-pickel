-- Create function to generate work order numbers in format YY9-XX
CREATE OR REPLACE FUNCTION public.generate_work_order_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    current_year TEXT;
    sequence_num TEXT;
    max_sequence INTEGER;
BEGIN
    -- Get last two digits of current year
    current_year := RIGHT(EXTRACT(YEAR FROM CURRENT_DATE)::TEXT, 2);
    
    -- Get the maximum sequence number for this year (looking for pattern YY9-XX)
    SELECT COALESCE(MAX(
        CAST(RIGHT(title, 2) AS INTEGER)
    ), 0) INTO max_sequence
    FROM work_orders 
    WHERE title LIKE current_year || '9-%'
    AND title ~ '^[0-9]{2}9-[0-9]{2}$';
    
    -- Increment and format as two digits
    sequence_num := LPAD((max_sequence + 1)::TEXT, 2, '0');
    
    -- Return formatted work order number
    RETURN current_year || '9-' || sequence_num;
END;
$$;