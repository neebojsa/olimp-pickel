-- Fix authenticate_staff function to handle NULL passwords and improve error messages
CREATE OR REPLACE FUNCTION public.authenticate_staff(staff_email text, staff_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  staff_record record;
  session_token text;
  session_expires timestamp with time zone;
  normalized_email text;
BEGIN
  -- Normalize email (trim and lowercase)
  normalized_email := lower(trim(staff_email));
  
  -- Find staff by email (case-insensitive)
  SELECT * INTO staff_record 
  FROM staff 
  WHERE lower(trim(email)) = normalized_email AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active account found with this email address');
  END IF;
  
  -- Check if password_hash is NULL or empty
  IF staff_record.password_hash IS NULL OR staff_record.password_hash = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'No password set for this account. Please contact your administrator.');
  END IF;
  
  -- Check password (in real implementation, use proper hashing)
  IF staff_record.password_hash != staff_password THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid password. Please check your credentials.');
  END IF;
  
  -- Generate session token using available methods
  session_token := encode(decode(md5(random()::text || clock_timestamp()::text), 'hex'), 'base64');
  session_expires := now() + interval '24 hours';
  
  -- Create session
  INSERT INTO staff_sessions (staff_id, session_token, expires_at)
  VALUES (staff_record.id, session_token, session_expires);
  
  -- Update last login
  UPDATE staff 
  SET last_login = now() 
  WHERE id = staff_record.id;
  
  -- Return success with staff info and token
  RETURN jsonb_build_object(
    'success', true,
    'staff', jsonb_build_object(
      'id', staff_record.id,
      'name', staff_record.name,
      'email', staff_record.email,
      'department', staff_record.department,
      'position', staff_record.position,
      'page_permissions', COALESCE(staff_record.page_permissions, '[]'::jsonb),
      'can_see_prices', COALESCE(staff_record.can_see_prices, false),
      'can_see_customers', COALESCE(staff_record.can_see_customers, false)
    ),
    'token', session_token
  );
END;
$function$;



