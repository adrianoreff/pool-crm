-- Pool CRM: routes, chemistry config, visit data, route metrics

-- Extend appointment source for route-generated visits
ALTER TYPE appointment_source ADD VALUE IF NOT EXISTS 'route';

-- Link appointments to recurring route stops
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS route_stop_id UUID,
  ADD COLUMN IF NOT EXISTS visit_type TEXT DEFAULT 'weekly_service';

CREATE INDEX IF NOT EXISTS idx_appointments_route_stop ON public.appointments(route_stop_id);

-- Primary photo for service report email
ALTER TABLE public.appointment_photos
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- ============================================================
-- Routes (fixed weekly technician routes)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  day_of_week day_of_week NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (business_id, technician_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_routes_business ON public.routes(business_id);
CREATE INDEX IF NOT EXISTS idx_routes_technician ON public.routes(technician_id);

-- ============================================================
-- Route stops (pools on a route, ordered)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  address_id UUID REFERENCES public.customer_addresses(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  est_minutes INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (route_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_route_stops_route ON public.route_stops(route_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_route_stops_customer ON public.route_stops(customer_id);

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_route_stop_id_fkey
  FOREIGN KEY (route_stop_id) REFERENCES public.route_stops(id) ON DELETE SET NULL;

-- ============================================================
-- Pool profile per customer
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pool_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  gallons INTEGER DEFAULT 0,
  notes TEXT,
  equipment_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (customer_id)
);

CREATE INDEX IF NOT EXISTS idx_pool_profiles_business ON public.pool_profiles(business_id);

-- ============================================================
-- Reading / dosage definitions (per business, Skimmer-style)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pool_reading_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  unit TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (business_id, key)
);

CREATE TABLE IF NOT EXISTS public.pool_dosage_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  unit TEXT,
  direction TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  preset_values JSONB DEFAULT '[]'::jsonb,
  cost_per_uom NUMERIC(10,3) DEFAULT 0,
  price_per_uom NUMERIC(10,3) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (business_id, key)
);

-- ============================================================
-- Per-visit readings, dosages, reports
-- ============================================================
CREATE TABLE IF NOT EXISTS public.visit_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  definition_id UUID NOT NULL REFERENCES public.pool_reading_definitions(id) ON DELETE CASCADE,
  value_numeric NUMERIC(12,4),
  value_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (appointment_id, definition_id)
);

CREATE TABLE IF NOT EXISTS public.visit_dosages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  definition_id UUID NOT NULL REFERENCES public.pool_dosage_definitions(id) ON DELETE CASCADE,
  amount_numeric NUMERIC(12,4),
  amount_display TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (appointment_id, definition_id)
);

CREATE TABLE IF NOT EXISTS public.visit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE UNIQUE,
  email_status TEXT DEFAULT 'pending',
  email_sent_at TIMESTAMPTZ,
  email_subject TEXT,
  customer_visible_notes TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Route day stats (admin dashboard cache)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.route_day_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  stats_date DATE NOT NULL,
  total_stops INTEGER DEFAULT 0,
  completed_stops INTEGER DEFAULT 0,
  skipped_stops INTEGER DEFAULT 0,
  miles_total NUMERIC(10,2),
  miles_remaining NUMERIC(10,2),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (route_id, stats_date)
);

-- ============================================================
-- Work orders (P2 foundation)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pool_work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  work_type TEXT NOT NULL DEFAULT 'repair',
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  labor_cost NUMERIC(10,2) DEFAULT 0,
  price NUMERIC(10,2) DEFAULT 0,
  assigned_technician_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  scheduled_date DATE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pool_work_orders_customer ON public.pool_work_orders(customer_id);

-- ============================================================
-- Shopping list (P2 foundation)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pool_shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  is_purchased BOOLEAN DEFAULT false,
  added_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  purchased_at TIMESTAMPTZ
);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_reading_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_dosage_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_dosages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_day_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_shopping_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "routes business access" ON public.routes
  FOR ALL USING (business_id = public.get_user_business_id())
  WITH CHECK (business_id = public.get_user_business_id());

CREATE POLICY "route_stops via route" ON public.route_stops
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.routes r WHERE r.id = route_stops.route_id AND r.business_id = public.get_user_business_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.routes r WHERE r.id = route_stops.route_id AND r.business_id = public.get_user_business_id())
  );

CREATE POLICY "pool_profiles business" ON public.pool_profiles
  FOR ALL USING (business_id = public.get_user_business_id())
  WITH CHECK (business_id = public.get_user_business_id());

CREATE POLICY "pool_reading_defs business" ON public.pool_reading_definitions
  FOR ALL USING (business_id = public.get_user_business_id())
  WITH CHECK (business_id = public.get_user_business_id());

CREATE POLICY "pool_dosage_defs business" ON public.pool_dosage_definitions
  FOR ALL USING (business_id = public.get_user_business_id())
  WITH CHECK (business_id = public.get_user_business_id());

CREATE POLICY "visit_readings via appointment" ON public.visit_readings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = visit_readings.appointment_id AND a.business_id = public.get_user_business_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = visit_readings.appointment_id AND a.business_id = public.get_user_business_id()
    )
  );

CREATE POLICY "visit_dosages via appointment" ON public.visit_dosages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = visit_dosages.appointment_id AND a.business_id = public.get_user_business_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = visit_dosages.appointment_id AND a.business_id = public.get_user_business_id()
    )
  );

CREATE POLICY "visit_reports via appointment" ON public.visit_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = visit_reports.appointment_id AND a.business_id = public.get_user_business_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = visit_reports.appointment_id AND a.business_id = public.get_user_business_id()
    )
  );

CREATE POLICY "route_day_stats via route" ON public.route_day_stats
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.routes r WHERE r.id = route_day_stats.route_id AND r.business_id = public.get_user_business_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.routes r WHERE r.id = route_day_stats.route_id AND r.business_id = public.get_user_business_id())
  );

CREATE POLICY "pool_work_orders business" ON public.pool_work_orders
  FOR ALL USING (business_id = public.get_user_business_id())
  WITH CHECK (business_id = public.get_user_business_id());

CREATE POLICY "pool_shopping_items business" ON public.pool_shopping_items
  FOR ALL USING (business_id = public.get_user_business_id())
  WITH CHECK (business_id = public.get_user_business_id());

-- ============================================================
-- Seed default chemistry + pool category for new businesses
-- ============================================================
CREATE OR REPLACE FUNCTION public.seed_pool_business_defaults(p_business_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  INSERT INTO public.service_categories (business_id, name, slug, icon, color, sort_order)
  VALUES (p_business_id, 'Pool Service', 'pool', 'Waves', '#0EA5E9', 0)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.services (business_id, name, description, duration_minutes, price, is_active, category_id)
  SELECT p_business_id, 'Weekly Pool Service', 'Regular weekly pool cleaning and chemical balance',
    30, 0, true, sc.id
  FROM public.service_categories sc
  WHERE sc.business_id = p_business_id AND sc.slug = 'pool'
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pool_reading_definitions (business_id, key, label, unit, sort_order) VALUES
    (p_business_id, 'free_chlorine', 'Free Chlorine', 'ppm', 0),
    (p_business_id, 'total_chlorine', 'Total Chlorine', 'ppm', 1),
    (p_business_id, 'ph', 'pH', NULL, 2),
    (p_business_id, 'total_alkalinity', 'Total Alkalinity', 'ppm', 3),
    (p_business_id, 'cyanuric_acid', 'Cyanuric Acid', 'ppm', 4)
  ON CONFLICT (business_id, key) DO NOTHING;

  INSERT INTO public.pool_dosage_definitions (business_id, key, label, unit, direction, sort_order, preset_values) VALUES
    (p_business_id, 'liquid_chlorine', 'Liquid Chlorine', 'gal', NULL, 0, '["1","2","2½","3"]'::jsonb),
    (p_business_id, 'tabs', 'Tabs', NULL, NULL, 1, '["1","2","3","4","5"]'::jsonb),
    (p_business_id, 'shock', 'Shock', 'lbs', NULL, 2, '["½","1","2"]'::jsonb),
    (p_business_id, 'ph_up', 'pH ↑', 'lbs', 'up', 3, '["¼","½","1"]'::jsonb),
    (p_business_id, 'ph_down', 'pH ↓', 'oz', 'down', 4, '["4","8","16"]'::jsonb)
  ON CONFLICT (business_id, key) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_pool_business_defaults(UUID) TO authenticated;

-- Patch create_business_with_owner to seed pool defaults (preserve original signature)
CREATE OR REPLACE FUNCTION public.create_business_with_owner(
  p_business_name TEXT,
  p_user_first_name TEXT DEFAULT NULL,
  p_user_last_name TEXT DEFAULT NULL,
  p_user_phone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  new_business_id UUID;
  current_user_id UUID;
  user_email TEXT;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM public.users WHERE id = current_user_id) THEN
    RAISE EXCEPTION 'User already belongs to a business';
  END IF;
  SELECT email INTO user_email FROM auth.users WHERE id = current_user_id;
  INSERT INTO public.businesses (name, email)
  VALUES (p_business_name, user_email)
  RETURNING id INTO new_business_id;
  INSERT INTO public.users (id, business_id, email, first_name, last_name, phone, role)
  VALUES (current_user_id, new_business_id, user_email, p_user_first_name, p_user_last_name, p_user_phone, 'owner');
  PERFORM public.seed_pool_business_defaults(new_business_id);
  RETURN new_business_id;
END;
$$;

-- Triggers updated_at
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON public.routes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_route_stops_updated_at BEFORE UPDATE ON public.route_stops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pool_profiles_updated_at BEFORE UPDATE ON public.pool_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_visit_reports_updated_at BEFORE UPDATE ON public.visit_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
