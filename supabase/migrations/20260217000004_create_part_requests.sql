-- Part requests from customer users (questions about parts)
CREATE TABLE public.part_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  contact_person_id UUID NOT NULL REFERENCES public.customer_contact_persons(id) ON DELETE CASCADE,
  requester_first_name TEXT NOT NULL,
  request_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_part_requests_inventory_id ON public.part_requests(inventory_id);
CREATE INDEX idx_part_requests_contact_person_id ON public.part_requests(contact_person_id);

ALTER TABLE public.part_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for part_requests" ON public.part_requests FOR ALL USING (true) WITH CHECK (true);
