-- Verify customer contact person session (for persistent login)
CREATE OR REPLACE FUNCTION public.verify_customer_contact_session(token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_record record;
  contact_record record;
BEGIN
  SELECT * INTO session_record
  FROM customer_contact_sessions
  WHERE session_token = token AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired session');
  END IF;

  SELECT ccp.*, c.name as customer_name INTO contact_record
  FROM customer_contact_persons ccp
  JOIN customers c ON c.id = ccp.customer_id
  WHERE ccp.id = session_record.contact_person_id AND ccp.is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contact person not found or inactive');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'staff', jsonb_build_object(
      'id', contact_record.id,
      'name', contact_record.name,
      'email', contact_record.email,
      'department', '',
      'position', 'Customer Contact',
      'page_permissions', COALESCE(contact_record.page_permissions, '[]'::jsonb),
      'can_see_prices', COALESCE(contact_record.can_see_prices, false),
      'can_see_customers', false,
      'customer_id', contact_record.customer_id,
      'customer_name', contact_record.customer_name,
      'is_customer_user', true
    )
  );
END;
$$;
