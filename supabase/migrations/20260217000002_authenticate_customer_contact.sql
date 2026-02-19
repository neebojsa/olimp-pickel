-- Authenticate customer contact person (login)
CREATE OR REPLACE FUNCTION public.authenticate_customer_contact(contact_username text, contact_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  contact_record record;
  customer_record record;
  session_token text;
  session_expires timestamp with time zone;
  normalized_username text;
BEGIN
  normalized_username := lower(trim(contact_username));
  
  SELECT ccp.*, c.name as customer_name INTO contact_record
  FROM customer_contact_persons ccp
  JOIN customers c ON c.id = ccp.customer_id
  WHERE lower(trim(ccp.login_username)) = normalized_username 
    AND ccp.is_active = true
    AND ccp.login_username IS NOT NULL
    AND ccp.password_hash IS NOT NULL
    AND ccp.password_hash != '';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active account found with this username');
  END IF;
  
  IF contact_record.password_hash != contact_password THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid password. Please check your credentials.');
  END IF;
  
  session_token := encode(decode(md5(random()::text || clock_timestamp()::text), 'hex'), 'base64');
  session_expires := now() + interval '24 hours';
  
  INSERT INTO customer_contact_sessions (contact_person_id, session_token, expires_at)
  VALUES (contact_record.id, session_token, session_expires);
  
  RETURN jsonb_build_object(
    'success', true,
    'contact', jsonb_build_object(
      'id', contact_record.id,
      'name', contact_record.name,
      'email', contact_record.email,
      'customer_id', contact_record.customer_id,
      'customer_name', contact_record.customer_name,
      'page_permissions', COALESCE(contact_record.page_permissions, '[]'::jsonb),
      'can_see_prices', COALESCE(contact_record.can_see_prices, false)
    ),
    'token', session_token
  );
END;
$function$;
