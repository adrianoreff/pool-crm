-- Include preset_values when seeding reading definitions for new businesses
CREATE OR REPLACE FUNCTION public.seed_pool_business_defaults(p_business_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_service_id UUID;
BEGIN
  INSERT INTO public.service_categories (business_id, name, slug, icon, color, sort_order)
  VALUES (p_business_id, 'Pool Service', 'pool', 'Waves', '#0EA5E9', 0)
  ON CONFLICT (business_id, slug) DO NOTHING;

  INSERT INTO public.services (
    business_id, name, description, duration_min, duration_max,
    base_price_min, base_price_max, is_active, category_id
  )
  SELECT
    p_business_id,
    'Weekly Pool Service',
    'Regular weekly pool cleaning and chemical balance',
    30,
    30,
    0,
    0,
    true,
    sc.id
  FROM public.service_categories sc
  WHERE sc.business_id = p_business_id AND sc.slug = 'pool'
    AND NOT EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.business_id = p_business_id AND s.name = 'Weekly Pool Service'
    );

  SELECT s.id INTO v_service_id
  FROM public.services s
  WHERE s.business_id = p_business_id AND s.name = 'Weekly Pool Service'
  LIMIT 1;

  IF v_service_id IS NOT NULL THEN
    INSERT INTO public.service_checklists (business_id, service_id, name, items, is_active)
    SELECT
      p_business_id,
      v_service_id,
      'Weekly Pool Service Checklist',
      '[
        {"id":"empty-baskets","description":"Empty Baskets","descriptionWhenComplete":"Emptied Baskets","frequencyType":"every_stop","intervalCount":1,"intervalUnit":"month","startOn":"next_stop","requireToFinishStop":false,"requirePhoto":false,"sortOrder":0},
        {"id":"skim-surface","description":"Skim Surface","descriptionWhenComplete":"Skimmed Surface","frequencyType":"every_stop","intervalCount":1,"intervalUnit":"month","startOn":"next_stop","requireToFinishStop":false,"requirePhoto":false,"sortOrder":1},
        {"id":"vacuum","description":"Vacuum","descriptionWhenComplete":"Vacuumed","frequencyType":"every_stop","intervalCount":1,"intervalUnit":"month","startOn":"next_stop","requireToFinishStop":false,"requirePhoto":false,"sortOrder":2},
        {"id":"backwash","description":"Backwash","descriptionWhenComplete":"Backwashed","frequencyType":"every_stop","intervalCount":1,"intervalUnit":"month","startOn":"next_stop","requireToFinishStop":false,"requirePhoto":false,"sortOrder":3},
        {"id":"brushed-walls","description":"Brushed Walls","descriptionWhenComplete":"Brushed Walls","frequencyType":"every_stop","intervalCount":1,"intervalUnit":"month","startOn":"next_stop","requireToFinishStop":false,"requirePhoto":false,"sortOrder":4},
        {"id":"filled-tab-floater","description":"Filled Tab Floater","descriptionWhenComplete":"Filled Tab Floater","frequencyType":"every_stop","intervalCount":1,"intervalUnit":"month","startOn":"next_stop","requireToFinishStop":false,"requirePhoto":false,"sortOrder":5}
      ]'::jsonb,
      true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.service_checklists sc WHERE sc.service_id = v_service_id
    );
  END IF;

  INSERT INTO public.pool_reading_definitions (business_id, key, label, unit, sort_order, preset_values) VALUES
    (p_business_id, 'free_chlorine', 'Free Chlorine', 'ppm', 0, '["0","1","2","3","4","5","6","7","8","9","10"]'::jsonb),
    (p_business_id, 'total_chlorine', 'Total Chlorine', 'ppm', 1, '["0","1","2","3","4","5","6","7","8","9","10"]'::jsonb),
    (p_business_id, 'ph', 'pH', NULL, 2, '["7.0","7.2","7.4","7.6","7.8","8.0","8.2","8.4"]'::jsonb),
    (p_business_id, 'total_alkalinity', 'Total Alkalinity', 'ppm', 3, '["40","60","80","100","120","140","160","180","200"]'::jsonb),
    (p_business_id, 'cyanuric_acid', 'Cyanuric Acid', 'ppm', 4, '["0","10","20","30","40","50","60","70","80","90","100"]'::jsonb),
    (p_business_id, 'total_bromine', 'Total Bromine', 'ppm', 5, '["0","1","2","3","4","5","6","7","8"]'::jsonb),
    (p_business_id, 'total_hardness', 'Total Hardness', 'ppm', 6, '["100","150","200","250","300","350","400","450","500"]'::jsonb),
    (p_business_id, 'salt', 'Salt', 'ppm', 7, '["2000","2500","2700","3000","3200","3400","3600","4000"]'::jsonb),
    (p_business_id, 'phosphates', 'Phosphates', 'ppb', 8, '["0","100","200","300","500","1000"]'::jsonb),
    (p_business_id, 'tds', 'Tds', 'ppm', 9, '["500","750","1000","1250","1500","2000","2500","3000"]'::jsonb)
  ON CONFLICT (business_id, key) DO NOTHING;

  INSERT INTO public.pool_dosage_definitions (business_id, key, label, unit, direction, sort_order, preset_values) VALUES
    (p_business_id, 'tabs', 'Tabs', NULL, NULL, 0, '["1","2","3","4","5"]'::jsonb),
    (p_business_id, 'liquid_chlorine', 'Liquid Chlorine', 'gal', NULL, 1, '["1","2","2½","3"]'::jsonb),
    (p_business_id, 'shock', 'Shock', 'lbs', NULL, 2, '["½","1","2"]'::jsonb),
    (p_business_id, 'ph_up', 'pH ↑', 'lbs', 'up', 3, '["¼","½","1"]'::jsonb),
    (p_business_id, 'ph_down', 'pH ↓', 'oz', 'down', 4, '["4","8","16"]'::jsonb),
    (p_business_id, 'alkalinity_up', 'Alkalinity ↑', 'lbs', 'up', 5, '["¼","½","1"]'::jsonb),
    (p_business_id, 'alkalinity_down', 'Alkalinity ↓', 'lbs', 'down', 6, '["¼","½","1"]'::jsonb),
    (p_business_id, 'calcium_up', 'Calcium ↑', 'lbs', 'up', 7, '["¼","½","1"]'::jsonb),
    (p_business_id, 'stabilizer', 'Stabilizer', 'lbs', NULL, 8, '["¼","½","1"]'::jsonb),
    (p_business_id, 'salt', 'Salt', 'lbs', NULL, 9, '["1","2","3","4","5"]'::jsonb)
  ON CONFLICT (business_id, key) DO NOTHING;
END;
$$;
