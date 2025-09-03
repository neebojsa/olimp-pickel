-- Create tool_categories table for custom tool categorization
CREATE TABLE public.tool_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_type TEXT NOT NULL CHECK (category_type IN ('machining_type', 'tool_type')),
  frequency INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, category_type)
);

-- Enable Row Level Security
ALTER TABLE public.tool_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for tool_categories
CREATE POLICY "Tool categories are viewable by everyone" 
ON public.tool_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create tool categories" 
ON public.tool_categories 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update tool categories" 
ON public.tool_categories 
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_tool_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tool_categories_updated_at
  BEFORE UPDATE ON public.tool_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tool_categories_updated_at();

-- Add indexes for better performance
CREATE INDEX idx_tool_categories_type ON public.tool_categories(category_type);
CREATE INDEX idx_tool_categories_frequency ON public.tool_categories(frequency DESC);