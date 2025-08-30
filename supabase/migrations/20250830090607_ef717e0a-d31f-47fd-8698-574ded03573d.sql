-- Create tools library for CNC machining tools and tool holders
CREATE TABLE public.tools_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_name TEXT NOT NULL,
  tool_type TEXT NOT NULL, -- 'cutting_tool', 'tool_holder', 'insert', 'workholding'
  category TEXT NOT NULL, -- 'end_mill', 'drill', 'tap', 'collet', 'chuck', 'insert', etc.
  description TEXT,
  specifications JSONB, -- diameter, length, coating, material, etc.
  manufacturer TEXT,
  part_number TEXT,
  typical_applications TEXT[],
  cutting_parameters JSONB, -- speeds, feeds, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tools_library ENABLE ROW LEVEL SECURITY;

-- Create policy for read access
CREATE POLICY "Tools library is viewable by everyone" 
ON public.tools_library 
FOR SELECT 
USING (true);

-- Insert common CNC machining tools and tool holders
INSERT INTO public.tools_library (tool_name, tool_type, category, description, specifications, manufacturer, typical_applications, cutting_parameters) VALUES
-- End Mills
('2-Flute Carbide End Mill', 'cutting_tool', 'end_mill', 'General purpose 2-flute carbide end mill', '{"diameter": "6mm", "length": "57mm", "flutes": 2, "material": "carbide", "coating": "TiAlN"}', 'Generic', ARRAY['aluminum', 'steel', 'general_machining'], '{"speed_rpm": "3000-8000", "feed_rate": "0.1-0.3"}'),
('4-Flute Carbide End Mill', 'cutting_tool', 'end_mill', 'High performance 4-flute carbide end mill', '{"diameter": "10mm", "length": "72mm", "flutes": 4, "material": "carbide", "coating": "TiAlN"}', 'Generic', ARRAY['steel', 'stainless_steel', 'finishing'], '{"speed_rpm": "2500-6000", "feed_rate": "0.2-0.4"}'),
('Ball Nose End Mill', 'cutting_tool', 'end_mill', 'Carbide ball nose end mill for 3D machining', '{"diameter": "8mm", "length": "60mm", "flutes": 2, "material": "carbide", "nose_radius": "4mm"}', 'Generic', ARRAY['3d_machining', 'contouring', 'molds'], '{"speed_rpm": "4000-10000", "feed_rate": "0.1-0.25"}'),

-- Drills
('HSS Twist Drill', 'cutting_tool', 'drill', 'High speed steel twist drill bit', '{"diameter": "8mm", "length": "117mm", "material": "HSS", "point_angle": "118°"}', 'Generic', ARRAY['steel', 'aluminum', 'general_drilling'], '{"speed_rpm": "1000-3000", "feed_rate": "0.1-0.2"}'),
('Carbide Drill', 'cutting_tool', 'drill', 'Solid carbide drill for high performance', '{"diameter": "5mm", "length": "86mm", "material": "carbide", "point_angle": "140°"}', 'Generic', ARRAY['steel', 'cast_iron', 'high_speed_drilling'], '{"speed_rpm": "2000-8000", "feed_rate": "0.05-0.15"}'),

-- Taps
('M6 x 1.0 Tap', 'cutting_tool', 'tap', 'Metric threading tap M6 x 1.0', '{"thread": "M6x1.0", "material": "HSS", "pitch": "1.0mm", "tap_drill": "5mm"}', 'Generic', ARRAY['threading', 'steel', 'aluminum'], '{"speed_rpm": "200-800", "feed_rate": "1.0"}'),
('M8 x 1.25 Tap', 'cutting_tool', 'tap', 'Metric threading tap M8 x 1.25', '{"thread": "M8x1.25", "material": "HSS", "pitch": "1.25mm", "tap_drill": "6.8mm"}', 'Generic', ARRAY['threading', 'steel', 'aluminum'], '{"speed_rpm": "150-600", "feed_rate": "1.25"}'),

-- Tool Holders
('ER25 Collet Chuck', 'tool_holder', 'collet_chuck', 'ER25 collet chuck system', '{"collet_range": "1-16mm", "taper": "BT40", "runout": "0.005mm", "max_rpm": "25000"}', 'Generic', ARRAY['end_mills', 'drills', 'high_precision'], '{"max_torque": "50Nm"}'),
('ER32 Collet Chuck', 'tool_holder', 'collet_chuck', 'ER32 collet chuck system', '{"collet_range": "3-20mm", "taper": "BT40", "runout": "0.005mm", "max_rpm": "20000"}', 'Generic', ARRAY['end_mills', 'drills', 'heavy_duty'], '{"max_torque": "80Nm"}'),
('Hydraulic Chuck', 'tool_holder', 'hydraulic_chuck', 'Hydraulic expansion chuck', '{"diameter_range": "3-25mm", "taper": "BT40", "runout": "0.003mm", "max_rpm": "30000"}', 'Generic', ARRAY['high_precision', 'high_speed', 'finishing'], '{"clamping_force": "15kN"}'),

-- Inserts
('CNMG 120408 Insert', 'cutting_tool', 'insert', 'Carbide turning insert CNMG', '{"grade": "KC5010", "coating": "CVD", "edge_prep": "sharp", "chipbreaker": "medium"}', 'Generic', ARRAY['turning', 'steel', 'finishing'], '{"speed_m_min": "150-300", "feed_rate": "0.1-0.3"}'),
('DCMT 11T308 Insert', 'cutting_tool', 'insert', 'Carbide turning insert DCMT', '{"grade": "KC5025", "coating": "PVD", "edge_prep": "honed", "chipbreaker": "light"}', 'Generic', ARRAY['turning', 'aluminum', 'finishing'], '{"speed_m_min": "300-600", "feed_rate": "0.05-0.2"}'),

-- Workholding
('6-Jaw Chuck', 'workholding', 'chuck', 'Self-centering 6-jaw chuck', '{"diameter": "200mm", "jaw_stroke": "25mm", "max_clamping_force": "50kN", "centering_accuracy": "0.02mm"}', 'Generic', ARRAY['turning', 'round_parts', 'thin_wall'], '{"max_rpm": "4000"}'),
('Machine Vise', 'workholding', 'vise', 'Precision machine vise', '{"jaw_width": "125mm", "opening": "150mm", "clamping_force": "25kN", "repeatability": "0.005mm"}', 'Generic', ARRAY['milling', 'rectangular_parts', 'small_parts'], '{}');

-- Create trigger for updated_at
CREATE TRIGGER update_tools_library_updated_at
  BEFORE UPDATE ON public.tools_library
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();