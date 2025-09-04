-- Create table for hierarchical tool categories
CREATE TABLE public.tool_category_hierarchy (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  parent_id UUID REFERENCES public.tool_category_hierarchy(id) ON DELETE CASCADE,
  picture_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for tool specification fields
CREATE TABLE public.tool_spec_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.tool_category_hierarchy(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tool_category_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_spec_fields ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view tool categories" 
ON public.tool_category_hierarchy 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create tool categories" 
ON public.tool_category_hierarchy 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update tool categories" 
ON public.tool_category_hierarchy 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete tool categories" 
ON public.tool_category_hierarchy 
FOR DELETE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view spec fields" 
ON public.tool_spec_fields 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create spec fields" 
ON public.tool_spec_fields 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update spec fields" 
ON public.tool_spec_fields 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete spec fields" 
ON public.tool_spec_fields 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Create triggers for updated_at
CREATE TRIGGER update_tool_category_hierarchy_updated_at
BEFORE UPDATE ON public.tool_category_hierarchy
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tool_spec_fields_updated_at
BEFORE UPDATE ON public.tool_spec_fields
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default categories
INSERT INTO public.tool_category_hierarchy (title) VALUES 
('Cutting Tools'),
('Measuring Tools');

INSERT INTO public.tool_category_hierarchy (title, parent_id) VALUES 
('End Mills', (SELECT id FROM public.tool_category_hierarchy WHERE title = 'Cutting Tools')),
('Drills', (SELECT id FROM public.tool_category_hierarchy WHERE title = 'Cutting Tools'));

INSERT INTO public.tool_category_hierarchy (title, parent_id) VALUES 
('Flat End Mills', (SELECT id FROM public.tool_category_hierarchy WHERE title = 'End Mills')),
('Ball End Mills', (SELECT id FROM public.tool_category_hierarchy WHERE title = 'End Mills'));