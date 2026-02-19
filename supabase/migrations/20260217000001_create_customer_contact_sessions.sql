-- Sessions for customer contact person login
CREATE TABLE public.customer_contact_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_person_id UUID NOT NULL REFERENCES public.customer_contact_persons(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_contact_sessions_token ON public.customer_contact_sessions(session_token);
CREATE INDEX idx_customer_contact_sessions_contact_person_id ON public.customer_contact_sessions(contact_person_id);

ALTER TABLE public.customer_contact_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all operations for customer_contact_sessions" ON public.customer_contact_sessions FOR ALL USING (true) WITH CHECK (true);
