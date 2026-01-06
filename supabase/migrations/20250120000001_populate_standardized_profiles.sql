-- Populate Angle profiles (from Mascot Steel data)
-- Get Angle shape ID
DO $$
DECLARE
  angle_shape_id UUID;
BEGIN
  SELECT id INTO angle_shape_id FROM public.shapes WHERE name = 'Angle';
  
  IF angle_shape_id IS NOT NULL THEN
    INSERT INTO public.standardized_profiles (shape_id, designation, kg_per_meter, dimensions, cross_sectional_area) VALUES
      (angle_shape_id, 'L 20x20x3', 0.98, '{"w": 20, "d": 20, "t": 3.0}'::jsonb, NULL),
      (angle_shape_id, 'L 25x25x3', 1.12, '{"w": 25, "d": 25, "t": 3.0}'::jsonb, NULL),
      (angle_shape_id, 'L 25x25x5', 1.65, '{"w": 25, "d": 25, "t": 5.0}'::jsonb, NULL),
      (angle_shape_id, 'L 25x25x6', 2.08, '{"w": 25, "d": 25, "t": 6.0}'::jsonb, NULL),
      (angle_shape_id, 'L 30x30x2.5', 1.06, '{"w": 30, "d": 30, "t": 2.5}'::jsonb, NULL),
      (angle_shape_id, 'L 30x30x3', 1.35, '{"w": 30, "d": 30, "t": 3.0}'::jsonb, NULL),
      (angle_shape_id, 'L 30x30x5', 2.01, '{"w": 30, "d": 30, "t": 5.0}'::jsonb, NULL),
      (angle_shape_id, 'L 30x30x6', 2.56, '{"w": 30, "d": 30, "t": 6.0}'::jsonb, NULL),
      (angle_shape_id, 'L 40x40x2.5', 1.43, '{"w": 40, "d": 40, "t": 2.5}'::jsonb, NULL),
      (angle_shape_id, 'L 40x40x3', 1.83, '{"w": 40, "d": 40, "t": 3.0}'::jsonb, NULL),
      (angle_shape_id, 'L 40x40x4', 2.2, '{"w": 40, "d": 40, "t": 4.0}'::jsonb, NULL),
      (angle_shape_id, 'L 40x40x5', 2.73, '{"w": 40, "d": 40, "t": 5.0}'::jsonb, NULL),
      (angle_shape_id, 'L 40x40x6', 3.5, '{"w": 40, "d": 40, "t": 6.0}'::jsonb, NULL),
      (angle_shape_id, 'L 50x50x2.5', 1.81, '{"w": 50, "d": 50, "t": 2.5}'::jsonb, NULL),
      (angle_shape_id, 'L 50x50x3', 2.31, '{"w": 50, "d": 50, "t": 3.0}'::jsonb, NULL),
      (angle_shape_id, 'L 50x50x4', 2.79, '{"w": 50, "d": 50, "t": 4.0}'::jsonb, NULL),
      (angle_shape_id, 'L 50x50x5', 3.48, '{"w": 50, "d": 50, "t": 5.0}'::jsonb, NULL),
      (angle_shape_id, 'L 50x50x6', 4.46, '{"w": 50, "d": 50, "t": 6.0}'::jsonb, NULL),
      (angle_shape_id, 'L 50x50x8', 5.68, '{"w": 50, "d": 50, "t": 8.0}'::jsonb, NULL),
      (angle_shape_id, 'L 65x65x4', 3.69, '{"w": 65, "d": 65, "t": 4.0}'::jsonb, NULL),
      (angle_shape_id, 'L 65x65x5', 4.56, '{"w": 65, "d": 65, "t": 5.0}'::jsonb, NULL),
      (angle_shape_id, 'L 65x65x6', 5.87, '{"w": 65, "d": 65, "t": 6.0}'::jsonb, NULL),
      (angle_shape_id, 'L 65x65x8', 7.51, '{"w": 65, "d": 65, "t": 8.0}'::jsonb, NULL),
      (angle_shape_id, 'L 75x75x4', 4.29, '{"w": 75, "d": 75, "t": 4.0}'::jsonb, NULL),
      (angle_shape_id, 'L 75x75x5', 5.27, '{"w": 75, "d": 75, "t": 5.0}'::jsonb, NULL),
      (angle_shape_id, 'L 75x75x6', 6.81, '{"w": 75, "d": 75, "t": 6.0}'::jsonb, NULL),
      (angle_shape_id, 'L 75x75x8', 8.73, '{"w": 75, "d": 75, "t": 8.0}'::jsonb, NULL),
      (angle_shape_id, 'L 100x100x4', 5.78, '{"w": 100, "d": 100, "t": 4.0}'::jsonb, NULL),
      (angle_shape_id, 'L 100x100x6', 9.16, '{"w": 100, "d": 100, "t": 6.0}'::jsonb, NULL),
      (angle_shape_id, 'L 100x100x8', 11.8, '{"w": 100, "d": 100, "t": 8.0}'::jsonb, NULL),
      (angle_shape_id, 'L 100x100x10', 14.2, '{"w": 100, "d": 100, "t": 10.0}'::jsonb, NULL)
    ON CONFLICT (shape_id, designation) DO NOTHING;
  END IF;
END $$;

-- Populate UPN profiles (sample data - full dataset would be added separately)
DO $$
DECLARE
  upn_shape_id UUID;
BEGIN
  SELECT id INTO upn_shape_id FROM public.shapes WHERE name = 'UPN';
  
  IF upn_shape_id IS NOT NULL THEN
    -- Sample UPN profiles - full dataset from PDF would be added here
    INSERT INTO public.standardized_profiles (shape_id, designation, kg_per_meter, dimensions, cross_sectional_area) VALUES
      (upn_shape_id, 'UPN 50', 5.98, '{"h": 50, "b": 30, "tw": 4.0, "tf": 7.0}'::jsonb, 7.61),
      (upn_shape_id, 'UPN 65', 7.14, '{"h": 65, "b": 42, "tw": 4.5, "tf": 7.5}'::jsonb, 9.10),
      (upn_shape_id, 'UPN 80', 8.64, '{"h": 80, "b": 45, "tw": 5.0, "tf": 8.0}'::jsonb, 11.00),
      (upn_shape_id, 'UPN 100', 10.6, '{"h": 100, "b": 50, "tw": 5.5, "tf": 8.5}'::jsonb, 13.50),
      (upn_shape_id, 'UPN 120', 13.4, '{"h": 120, "b": 55, "tw": 6.0, "tf": 9.0}'::jsonb, 17.10),
      (upn_shape_id, 'UPN 140', 16.0, '{"h": 140, "b": 60, "tw": 6.5, "tf": 9.5}'::jsonb, 20.40),
      (upn_shape_id, 'UPN 160', 18.8, '{"h": 160, "b": 65, "tw": 7.0, "tf": 10.0}'::jsonb, 24.00),
      (upn_shape_id, 'UPN 180', 22.0, '{"h": 180, "b": 70, "tw": 7.5, "tf": 10.5}'::jsonb, 28.00),
      (upn_shape_id, 'UPN 200', 25.3, '{"h": 200, "b": 75, "tw": 8.0, "tf": 11.0}'::jsonb, 32.20),
      (upn_shape_id, 'UPN 240', 33.0, '{"h": 240, "b": 85, "tw": 9.0, "tf": 12.0}'::jsonb, 42.00),
      (upn_shape_id, 'UPN 260', 36.2, '{"h": 260, "b": 90, "tw": 9.5, "tf": 12.5}'::jsonb, 46.10),
      (upn_shape_id, 'UPN 280', 40.3, '{"h": 280, "b": 95, "tw": 10.0, "tf": 13.0}'::jsonb, 51.30),
      (upn_shape_id, 'UPN 300', 43.0, '{"h": 300, "b": 100, "tw": 10.0, "tf": 13.5}'::jsonb, 54.80)
    ON CONFLICT (shape_id, designation) DO NOTHING;
  END IF;
END $$;

-- Populate HEA profiles (sample data)
DO $$
DECLARE
  hea_shape_id UUID;
BEGIN
  SELECT id INTO hea_shape_id FROM public.shapes WHERE name = 'HEA';
  
  IF hea_shape_id IS NOT NULL THEN
    INSERT INTO public.standardized_profiles (shape_id, designation, kg_per_meter, dimensions, cross_sectional_area) VALUES
      (hea_shape_id, 'HEA 100', 16.7, '{"h": 96, "b": 100, "tw": 5.0, "tf": 8.0}'::jsonb, 21.24),
      (hea_shape_id, 'HEA 120', 19.9, '{"h": 114, "b": 120, "tw": 5.0, "tf": 8.0}'::jsonb, 25.34),
      (hea_shape_id, 'HEA 140', 24.7, '{"h": 133, "b": 140, "tw": 5.5, "tf": 8.5}'::jsonb, 31.42),
      (hea_shape_id, 'HEA 160', 30.4, '{"h": 152, "b": 160, "tw": 6.0, "tf": 9.0}'::jsonb, 38.76),
      (hea_shape_id, 'HEA 180', 35.5, '{"h": 171, "b": 180, "tw": 6.0, "tf": 9.5}'::jsonb, 45.25),
      (hea_shape_id, 'HEA 200', 42.3, '{"h": 190, "b": 200, "tw": 6.5, "tf": 10.0}'::jsonb, 53.83),
      (hea_shape_id, 'HEA 220', 50.5, '{"h": 210, "b": 220, "tw": 7.0, "tf": 11.0}'::jsonb, 64.28),
      (hea_shape_id, 'HEA 240', 60.3, '{"h": 230, "b": 240, "tw": 7.5, "tf": 12.0}'::jsonb, 76.84),
      (hea_shape_id, 'HEA 260', 68.2, '{"h": 250, "b": 260, "tw": 7.5, "tf": 12.5}'::jsonb, 86.82),
      (hea_shape_id, 'HEA 280', 76.4, '{"h": 270, "b": 280, "tw": 8.0, "tf": 13.0}'::jsonb, 97.26),
      (hea_shape_id, 'HEA 300', 88.3, '{"h": 290, "b": 300, "tw": 8.5, "tf": 14.0}'::jsonb, 112.50)
    ON CONFLICT (shape_id, designation) DO NOTHING;
  END IF;
END $$;

-- Populate HEB profiles (sample data)
DO $$
DECLARE
  heb_shape_id UUID;
BEGIN
  SELECT id INTO heb_shape_id FROM public.shapes WHERE name = 'HEB';
  
  IF heb_shape_id IS NOT NULL THEN
    INSERT INTO public.standardized_profiles (shape_id, designation, kg_per_meter, dimensions, cross_sectional_area) VALUES
      (heb_shape_id, 'HEB 100', 20.4, '{"h": 100, "b": 100, "tw": 6.0, "tf": 10.0}'::jsonb, 26.00),
      (heb_shape_id, 'HEB 120', 26.7, '{"h": 120, "b": 120, "tw": 6.5, "tf": 11.0}'::jsonb, 34.00),
      (heb_shape_id, 'HEB 140', 33.7, '{"h": 140, "b": 140, "tw": 7.0, "tf": 12.0}'::jsonb, 43.00),
      (heb_shape_id, 'HEB 160', 42.6, '{"h": 160, "b": 160, "tw": 8.0, "tf": 13.0}'::jsonb, 54.30),
      (heb_shape_id, 'HEB 180', 51.2, '{"h": 180, "b": 180, "tw": 8.5, "tf": 14.0}'::jsonb, 65.30),
      (heb_shape_id, 'HEB 200', 61.3, '{"h": 200, "b": 200, "tw": 9.0, "tf": 15.0}'::jsonb, 78.10),
      (heb_shape_id, 'HEB 220', 71.5, '{"h": 220, "b": 220, "tw": 9.5, "tf": 16.0}'::jsonb, 91.00),
      (heb_shape_id, 'HEB 240', 83.2, '{"h": 240, "b": 240, "tw": 10.0, "tf": 17.0}'::jsonb, 106.00),
      (heb_shape_id, 'HEB 260', 93.0, '{"h": 260, "b": 260, "tw": 10.0, "tf": 17.5}'::jsonb, 118.00),
      (heb_shape_id, 'HEB 280', 103.0, '{"h": 280, "b": 280, "tw": 10.5, "tf": 18.0}'::jsonb, 131.00),
      (heb_shape_id, 'HEB 300', 117.0, '{"h": 300, "b": 300, "tw": 11.0, "tf": 19.0}'::jsonb, 149.00)
    ON CONFLICT (shape_id, designation) DO NOTHING;
  END IF;
END $$;



