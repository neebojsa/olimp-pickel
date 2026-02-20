-- Update app title from "Olimp Pickel" to "Olimp ERP"
UPDATE public.system_settings
SET app_title = 'Olimp ERP'
WHERE app_title = 'Olimp Pickel';

-- Update default for future inserts (alter column default)
ALTER TABLE public.system_settings
ALTER COLUMN app_title SET DEFAULT 'Olimp ERP';
