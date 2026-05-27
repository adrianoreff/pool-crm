-- Pool profile fields for customer add/edit
ALTER TABLE public.pool_profiles
  ADD COLUMN IF NOT EXISTS pool_type TEXT,
  ADD COLUMN IF NOT EXISTS sanitizer_type TEXT,
  ADD COLUMN IF NOT EXISTS has_pool BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS has_spa BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_water_feature BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS service_rate NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS service_rate_type TEXT,
  ADD COLUMN IF NOT EXISTS labor_cost NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS labor_cost_type TEXT,
  ADD COLUMN IF NOT EXISTS minutes_at_stop INTEGER,
  ADD COLUMN IF NOT EXISTS location_notes TEXT;

COMMENT ON COLUMN public.pool_profiles.pool_type IS 'inground, above_ground, plastic';
COMMENT ON COLUMN public.pool_profiles.sanitizer_type IS 'salt, chlorine';

-- Route stop scheduling window and frequency
ALTER TABLE public.route_stops
  ADD COLUMN IF NOT EXISTS frequency_weeks SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS start_on DATE,
  ADD COLUMN IF NOT EXISTS stop_after DATE;

ALTER TABLE public.route_stops
  DROP CONSTRAINT IF EXISTS route_stops_frequency_weeks_check;

ALTER TABLE public.route_stops
  ADD CONSTRAINT route_stops_frequency_weeks_check
  CHECK (frequency_weeks >= 1 AND frequency_weeks <= 4);
