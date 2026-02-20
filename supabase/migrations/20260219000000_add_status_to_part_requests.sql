-- Add status column to part_requests for administrator workflow
-- active: shown in inventory parts list
-- processed: hidden from list (green badge)
-- cancelled: hidden from list (light red badge)
ALTER TABLE public.part_requests
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
CHECK (status IN ('active', 'processed', 'cancelled'));

COMMENT ON COLUMN public.part_requests.status IS 'Request status: active (blue), processed (green), cancelled (light red). Processed/cancelled requests are hidden from inventory parts list.';
