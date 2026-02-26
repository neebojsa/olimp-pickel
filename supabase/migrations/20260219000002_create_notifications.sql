-- Notifications table - extensible for future notification types
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_staff_id);
CREATE INDEX idx_notifications_read_at ON public.notifications(read_at);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view own notifications"
ON public.notifications FOR SELECT
USING (recipient_staff_id IN (SELECT id FROM public.staff));

CREATE POLICY "Staff can update own notifications (mark read)"
ON public.notifications FOR UPDATE
USING (recipient_staff_id IN (SELECT id FROM public.staff))
WITH CHECK (recipient_staff_id IN (SELECT id FROM public.staff));

-- Allow insert from authenticated context (app creates for admins)
CREATE POLICY "Allow insert for notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

COMMENT ON TABLE public.notifications IS 'User notifications - extensible notification center';
COMMENT ON COLUMN public.notifications.type IS 'Notification type: po_created, etc.';
COMMENT ON COLUMN public.notifications.data IS 'Extra data: e.g. { purchase_order_id, purchase_order_number }';
