-- Customer contact persons with login credentials and permissions
CREATE TABLE public.customer_contact_persons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  login_username TEXT UNIQUE,
  password_hash TEXT,
  page_permissions JSONB DEFAULT '[]'::jsonb,
  can_see_prices BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_contact_persons_customer_id ON public.customer_contact_persons(customer_id);
CREATE UNIQUE INDEX idx_customer_contact_persons_login_username ON public.customer_contact_persons(login_username) WHERE login_username IS NOT NULL;

ALTER TABLE public.customer_contact_persons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all operations for customer_contact_persons" ON public.customer_contact_persons FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_customer_contact_persons_updated_at 
  BEFORE UPDATE ON public.customer_contact_persons 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
