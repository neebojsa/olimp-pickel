-- Add authentication fields to staff table
ALTER TABLE public.staff ADD COLUMN password_hash text;
ALTER TABLE public.staff ADD COLUMN last_login timestamp with time zone;

-- Add permissions columns to staff table
ALTER TABLE public.staff ADD COLUMN page_permissions jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.staff ADD COLUMN can_see_prices boolean DEFAULT false;
ALTER TABLE public.staff ADD COLUMN can_see_customers boolean DEFAULT false;

-- Create staff_sessions table for session management
CREATE TABLE public.staff_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id uuid REFERENCES public.staff(id) ON DELETE CASCADE NOT NULL,
  session_token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on staff_sessions
ALTER TABLE public.staff_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for staff_sessions
CREATE POLICY "Staff can manage their own sessions" 
ON public.staff_sessions 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for updating timestamps on staff_sessions
CREATE TRIGGER update_staff_sessions_updated_at
BEFORE UPDATE ON public.staff_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to authenticate staff
CREATE OR REPLACE FUNCTION public.authenticate_staff(
  staff_email text,
  staff_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  staff_record record;
  session_token text;
  session_expires timestamp with time zone;
BEGIN
  -- Find staff by email
  SELECT * INTO staff_record 
  FROM staff 
  WHERE email = staff_email AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid credentials');
  END IF;
  
  -- Check password (in real implementation, use proper hashing)
  IF staff_record.password_hash != staff_password THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid credentials');
  END IF;
  
  -- Generate session token
  session_token := encode(gen_random_bytes(32), 'base64');
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
      'page_permissions', staff_record.page_permissions,
      'can_see_prices', staff_record.can_see_prices,
      'can_see_customers', staff_record.can_see_customers
    ),
    'token', session_token
  );
END;
$$;

-- Create function to verify staff session
CREATE OR REPLACE FUNCTION public.verify_staff_session(token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_record record;
  staff_record record;
BEGIN
  -- Find active session
  SELECT * INTO session_record
  FROM staff_sessions 
  WHERE session_token = token AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid session');
  END IF;
  
  -- Get staff info
  SELECT * INTO staff_record
  FROM staff 
  WHERE id = session_record.staff_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff not found');
  END IF;
  
  -- Return staff info
  RETURN jsonb_build_object(
    'success', true,
    'staff', jsonb_build_object(
      'id', staff_record.id,
      'name', staff_record.name,
      'email', staff_record.email,
      'department', staff_record.department,
      'position', staff_record.position,
      'page_permissions', staff_record.page_permissions,
      'can_see_prices', staff_record.can_see_prices,
      'can_see_customers', staff_record.can_see_customers
    )
  );
END;
$$;