-- Create system_settings table for global app settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  app_title TEXT NOT NULL DEFAULT 'Olimp Pickel',
  favicon_url TEXT
);

-- Enable Row Level Security
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for system settings
CREATE POLICY "System settings are viewable by everyone" 
ON public.system_settings 
FOR SELECT 
USING (true);

CREATE POLICY "System settings can be created by everyone" 
ON public.system_settings 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System settings can be updated by everyone" 
ON public.system_settings 
FOR UPDATE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default row if table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.system_settings LIMIT 1) THEN
    INSERT INTO public.system_settings (app_title) VALUES ('Olimp Pickel');
  END IF;
END $$;
