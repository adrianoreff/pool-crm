-- Add preset_values to reading definitions (Skimmer-style tap pickers)
ALTER TABLE public.pool_reading_definitions
  ADD COLUMN IF NOT EXISTS preset_values JSONB DEFAULT '[]'::jsonb;

-- Backfill common reading presets where empty
UPDATE public.pool_reading_definitions SET preset_values = '["0","1","2","3","4","5","6","7","8","9","10"]'::jsonb
WHERE key = 'free_chlorine' AND (preset_values IS NULL OR preset_values = '[]'::jsonb);

UPDATE public.pool_reading_definitions SET preset_values = '["0","1","2","3","4","5","6","7","8","9","10"]'::jsonb
WHERE key = 'total_chlorine' AND (preset_values IS NULL OR preset_values = '[]'::jsonb);

UPDATE public.pool_reading_definitions SET preset_values = '["7.0","7.2","7.4","7.6","7.8","8.0","8.2","8.4"]'::jsonb
WHERE key = 'ph' AND (preset_values IS NULL OR preset_values = '[]'::jsonb);

UPDATE public.pool_reading_definitions SET preset_values = '["40","60","80","100","120","140","160","180","200"]'::jsonb
WHERE key = 'total_alkalinity' AND (preset_values IS NULL OR preset_values = '[]'::jsonb);

UPDATE public.pool_reading_definitions SET preset_values = '["0","10","20","30","40","50","60","70","80","90","100"]'::jsonb
WHERE key = 'cyanuric_acid' AND (preset_values IS NULL OR preset_values = '[]'::jsonb);

UPDATE public.pool_reading_definitions SET preset_values = '["0","1","2","3","4","5","6","7","8"]'::jsonb
WHERE key = 'total_bromine' AND (preset_values IS NULL OR preset_values = '[]'::jsonb);

UPDATE public.pool_reading_definitions SET preset_values = '["100","150","200","250","300","350","400","450","500"]'::jsonb
WHERE key = 'total_hardness' AND (preset_values IS NULL OR preset_values = '[]'::jsonb);

UPDATE public.pool_reading_definitions SET preset_values = '["2000","2500","2700","3000","3200","3400","3600","4000"]'::jsonb
WHERE key = 'salt' AND (preset_values IS NULL OR preset_values = '[]'::jsonb);

UPDATE public.pool_reading_definitions SET preset_values = '["0","100","200","300","500","1000"]'::jsonb
WHERE key = 'phosphates' AND (preset_values IS NULL OR preset_values = '[]'::jsonb);

UPDATE public.pool_reading_definitions SET preset_values = '["500","750","1000","1250","1500","2000","2500","3000"]'::jsonb
WHERE key = 'tds' AND (preset_values IS NULL OR preset_values = '[]'::jsonb);
