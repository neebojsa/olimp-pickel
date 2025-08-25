-- Create materials library table
CREATE TABLE public.materials_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_type TEXT NOT NULL, -- 'Steel', 'Bronze', 'Aluminium'
  grade TEXT NOT NULL, -- The main designation (e.g., 'C45', 'CuAI10Fe2', 'Al-Cu4SiMg')
  material_number TEXT, -- The secondary designation (e.g., '1.0503', 'CB331G', 'AA2014')
  density NUMERIC(5,2), -- Specific density in g/cm³
  description TEXT, -- Additional description
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.materials_library ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Materials library is viewable by everyone" 
ON public.materials_library 
FOR SELECT 
USING (true);

-- Create indexes for efficient searching
CREATE INDEX idx_materials_library_type ON public.materials_library(material_type);
CREATE INDEX idx_materials_library_grade ON public.materials_library(grade);
CREATE INDEX idx_materials_library_number ON public.materials_library(material_number);

-- Insert Steel materials (common grades)
INSERT INTO public.materials_library (material_type, grade, material_number, density, description) VALUES
('Steel', 'C45', '1.0503', 7.85, 'Medium carbon steel'),
('Steel', 'C15', '1.0401', 7.87, 'Low carbon steel'),
('Steel', 'C22', '1.0402', 7.85, 'Low carbon steel'),
('Steel', 'C35', '1.0501', 7.85, 'Medium carbon steel'),
('Steel', 'C60', '1.0601', 7.85, 'High carbon steel'),
('Steel', 'S235JR', '1.0037', 7.85, 'Structural steel'),
('Steel', 'S275JR', '1.0044', 7.85, 'Structural steel'),
('Steel', 'S355JR', '1.0045', 7.85, 'Structural steel'),
('Steel', '42CrMo4', '1.7225', 7.85, 'Alloy steel, chromium-molybdenum'),
('Steel', '34CrNiMo6', '1.6582', 7.85, 'Alloy steel, chromium-nickel-molybdenum'),
('Steel', '16MnCr5', '1.7131', 7.85, 'Case hardening steel'),
('Steel', '100Cr6', '1.3505', 7.81, 'Bearing steel'),
('Steel', 'X5CrNi18-10', '1.4301', 7.93, 'Stainless steel (304)'),
('Steel', 'X2CrNiMo17-12-2', '1.4404', 8.00, 'Stainless steel (316L)'),
('Steel', 'X6CrNiTi18-10', '1.4541', 7.90, 'Stainless steel (321)'),
('Steel', 'X10CrNi18-8', '1.4310', 7.90, 'Stainless steel (301)'),
('Steel', 'X12CrNi25-21', '1.4845', 7.95, 'Heat resistant steel'),
('Steel', 'C105W1', '1.1545', 7.85, 'Tool steel'),
('Steel', 'X210Cr12', '1.2080', 7.70, 'Cold work tool steel'),
('Steel', 'HS6-5-2', '1.3343', 8.05, 'High speed steel');

-- Insert Bronze materials
INSERT INTO public.materials_library (material_type, grade, material_number, density, description) VALUES
('Bronze', 'CuAI10Fe2', 'CB331G', 7.60, 'Aluminum bronze'),
('Bronze', 'CuAI10Fe5Ni5', 'CB333G', 7.55, 'Aluminum bronze with nickel'),
('Bronze', 'CuAI10Ni3Fe2', 'CB332G', 7.58, 'Aluminum bronze with nickel'),
('Bronze', 'CuAI11Fe6Ni6', 'CB334G', 7.50, 'Aluminum bronze with nickel'),
('Bronze', 'CuAI9', 'CB330G', 7.65, 'Aluminum bronze'),
('Bronze', 'CuSn10', 'CB480K', 8.80, 'Tin bronze'),
('Bronze', 'CuSn11P', 'CB481K', 8.78, 'Phosphor bronze'),
('Bronze', 'CuSn12', 'CB483K', 8.75, 'Tin bronze'),
('Bronze', 'CuSn12Ni2', 'CB484K', 8.70, 'Tin bronze with nickel'),
('Bronze', 'CuSn5Zn5Pb5', 'CB491K', 8.50, 'Gun metal'),
('Bronze', 'CuSn6Zn4Pb2', 'CB498K', 8.60, 'Gun metal'),
('Bronze', 'CuSn7Zn2Pb3', 'CB492K', 8.55, 'Gun metal'),
('Bronze', 'CuSn7Zn4Pb7', 'CB493K', 8.40, 'Gun metal'),
('Bronze', 'CuSn10Pb10', 'CB495K', 8.30, 'Leaded tin bronze'),
('Bronze', 'CuSn11Pb2', 'CB482K', 8.70, 'Leaded tin bronze'),
('Bronze', 'CuSn3Zn8Pb5', 'CB490K', 8.50, 'Leaded tin bronze'),
('Bronze', 'CuSn5Pb20', 'CB497K', 8.00, 'High lead bronze'),
('Bronze', 'CuSn5Pb9', 'CB494K', 8.40, 'Leaded tin bronze'),
('Bronze', 'CuSn7Pb15', 'CB496K', 8.20, 'High lead bronze'),
('Bronze', 'CuZn16Si4', 'CB761S', 8.30, 'Silicon brass'),
('Bronze', 'CuZn33Pb2', 'CB750S', 8.40, 'Leaded brass'),
('Bronze', 'CuZn37AI1', 'CB766S', 8.25, 'Aluminum brass'),
('Bronze', 'CuZn25AI5Mn4Fe3', 'CB762S', 7.80, 'High tensile brass'),
('Bronze', 'CuZn32AI2Mn2Fe1', 'CB763S', 8.10, 'High tensile brass');

-- Insert Aluminium materials (using ISO designations)
INSERT INTO public.materials_library (material_type, grade, material_number, density, description) VALUES
('Aluminium', 'Al99,5', '1050A', 2.70, 'Pure aluminum'),
('Aluminium', 'Al99,7', '1070A', 2.70, 'Pure aluminum'),
('Aluminium', 'Al99,8', '1080A', 2.70, 'Pure aluminum'),
('Aluminium', 'Al99', '1200', 2.70, 'Pure aluminum'),
('Aluminium', 'AlCu4PbMgMn', '2007', 2.78, 'Aluminum-copper alloy'),
('Aluminium', 'Al-Cu6BiPb', '2011', 2.82, 'Free-cutting aluminum'),
('Aluminium', 'Al-Cu4SiMg', '2014', 2.80, 'High strength aluminum'),
('Aluminium', 'Al-Cu4Mg', '2017A', 2.79, 'Duralumin'),
('Aluminium', 'Al-Cu4Mg1', '2024', 2.78, 'High strength aluminum'),
('Aluminium', 'Al-Cu2Mg', '2117', 2.76, 'Aluminum-copper alloy'),
('Aluminium', 'Al-Mn1Cu', '3003', 2.73, 'Aluminum-manganese alloy'),
('Aluminium', 'AlMn1Mg1', '3004', 2.72, 'Aluminum-manganese alloy'),
('Aluminium', 'AlMn1Mg0,5', '3005', 2.72, 'Aluminum-manganese alloy'),
('Aluminium', 'Al-Mn1', '3103', 2.73, 'Aluminum-manganese alloy'),
('Aluminium', 'AlMn0,5Mg0,5', '3105', 2.72, 'Aluminum-manganese alloy'),
('Aluminium', 'Al-Mg1', '5005A', 2.70, 'Aluminum-magnesium alloy'),
('Aluminium', 'AlMg2Mn0,8', '5049', 2.66, 'Aluminum-magnesium alloy'),
('Aluminium', 'Al-Mg1,5', '5050B', 2.69, 'Aluminum-magnesium alloy'),
('Aluminium', 'Al-Mg2,5', '5052', 2.68, 'Aluminum-magnesium alloy'),
('Aluminium', 'Al-Mg5', '5056A', 2.64, 'Aluminum-magnesium alloy'),
('Aluminium', 'Al-Mg4', '5082', 2.65, 'Marine grade aluminum'),
('Aluminium', 'Al-Mg4,5Mn', '5083', 2.66, 'Marine grade aluminum'),
('Aluminium', 'AlMg4', '5086', 2.66, 'Aluminum-magnesium alloy'),
('Aluminium', 'Al-Mg2', '5251', 2.68, 'Aluminum-magnesium alloy'),
('Aluminium', 'Al-Mg3Mn', '5454', 2.69, 'Aluminum-magnesium alloy'),
('Aluminium', 'Al-Mg3', '5754', 2.67, 'Aluminum-magnesium alloy'),
('Aluminium', 'Al-SiMg', '6005A', 2.70, 'Structural aluminum'),
('Aluminium', 'AlMgSiPb', '6012', 2.71, 'Free-cutting aluminum'),
('Aluminium', 'Al-MgSi', '6060', 2.70, 'Structural aluminum'),
('Aluminium', 'Al-Mg1SiCu', '6061', 2.70, 'Structural aluminum'),
('Aluminium', 'Al-Si1Mg', '6082', 2.70, 'Structural aluminum'),
('Aluminium', 'Al-Zn4,5Mg1', '7020', 2.76, 'High strength aluminum'),
('Aluminium', 'AlZn5Mg3Cu', '7022', 2.78, 'High strength aluminum'),
('Aluminium', 'Al-Zn6MgCu', '7075', 2.81, 'Ultra high strength aluminum');

-- Create trigger for updated_at
CREATE TRIGGER update_materials_library_updated_at
  BEFORE UPDATE ON public.materials_library
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();