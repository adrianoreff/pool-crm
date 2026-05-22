-- Generate weekly visit appointments from route stops

CREATE OR REPLACE FUNCTION public.generate_route_visits(
  p_route_id UUID,
  p_scheduled_date DATE
)
RETURNS TABLE (
  appointment_id UUID,
  customer_id UUID,
  created BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_route public.routes%ROWTYPE;
  v_service_id UUID;
  v_stop RECORD;
  v_appt_id UUID;
  v_exists BOOLEAN;
  v_address TEXT;
  v_city TEXT;
  v_state TEXT;
  v_zip TEXT;
  v_lat DOUBLE PRECISION;
  v_lng DOUBLE PRECISION;
BEGIN
  SELECT * INTO v_route FROM public.routes WHERE id = p_route_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Route not found';
  END IF;
  IF v_route.business_id <> public.get_user_business_id() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT s.id INTO v_service_id
  FROM public.services s
  JOIN public.service_categories sc ON sc.id = s.category_id
  WHERE s.business_id = v_route.business_id
    AND sc.slug = 'pool'
    AND s.is_active = true
  ORDER BY s.created_at
  LIMIT 1;

  IF v_service_id IS NULL THEN
    SELECT s.id INTO v_service_id
    FROM public.services s
    WHERE s.business_id = v_route.business_id AND s.is_active = true
    ORDER BY s.created_at
    LIMIT 1;
  END IF;

  FOR v_stop IN
    SELECT rs.*, c.first_name, c.last_name, c.email, c.phone
    FROM public.route_stops rs
    JOIN public.customers c ON c.id = rs.customer_id
    WHERE rs.route_id = p_route_id AND rs.is_active = true
    ORDER BY rs.sort_order
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.route_stop_id = v_stop.id
        AND a.scheduled_date = p_scheduled_date
        AND a.status <> 'cancelled'
    ) INTO v_exists;

    IF v_exists THEN
      SELECT a.id INTO v_appt_id
      FROM public.appointments a
      WHERE a.route_stop_id = v_stop.id
        AND a.scheduled_date = p_scheduled_date
        AND a.status <> 'cancelled'
      LIMIT 1;
      appointment_id := v_appt_id;
      customer_id := v_stop.customer_id;
      created := false;
      RETURN NEXT;
      CONTINUE;
    END IF;

    SELECT ca.address, ca.city, ca.state, ca.zip_code, ca.latitude, ca.longitude
    INTO v_address, v_city, v_state, v_zip, v_lat, v_lng
    FROM public.customer_addresses ca
    WHERE ca.id = COALESCE(v_stop.address_id, (
      SELECT id FROM public.customer_addresses
      WHERE customer_id = v_stop.customer_id AND is_primary = true
      LIMIT 1
    ))
    LIMIT 1;

    IF v_address IS NULL THEN
      SELECT ca.address, ca.city, ca.state, ca.zip_code, ca.latitude, ca.longitude
      INTO v_address, v_city, v_state, v_zip, v_lat, v_lng
      FROM public.customer_addresses ca
      WHERE ca.customer_id = v_stop.customer_id
      ORDER BY ca.is_primary DESC NULLS LAST
      LIMIT 1;
    END IF;

    IF v_address IS NULL THEN
      v_address := 'Address required';
    END IF;

    INSERT INTO public.appointments (
      business_id,
      customer_id,
      technician_id,
      service_id,
      route_stop_id,
      visit_type,
      scheduled_date,
      scheduled_start_time,
      scheduled_end_time,
      address,
      city,
      state,
      zip_code,
      latitude,
      longitude,
      status,
      source
    ) VALUES (
      v_route.business_id,
      v_stop.customer_id,
      v_route.technician_id,
      v_service_id,
      v_stop.id,
      'weekly_service',
      p_scheduled_date,
      '08:00',
      '08:30',
      v_address,
      v_city,
      v_state,
      v_zip,
      v_lat,
      v_lng,
      'scheduled',
      'route'
    )
    RETURNING id INTO v_appt_id;

    appointment_id := v_appt_id;
    customer_id := v_stop.customer_id;
    created := true;
    RETURN NEXT;
  END LOOP;

  INSERT INTO public.route_day_stats (route_id, stats_date, total_stops, completed_stops, skipped_stops)
  SELECT p_route_id, p_scheduled_date,
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE a.status = 'completed')::INTEGER,
    COUNT(*) FILTER (WHERE a.status = 'no_show')::INTEGER
  FROM public.appointments a
  WHERE a.route_stop_id IN (SELECT id FROM public.route_stops WHERE route_id = p_route_id AND is_active = true)
    AND a.scheduled_date = p_scheduled_date
  ON CONFLICT (route_id, stats_date) DO UPDATE SET
    total_stops = EXCLUDED.total_stops,
    completed_stops = EXCLUDED.completed_stops,
    skipped_stops = EXCLUDED.skipped_stops,
    updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_route_visits(UUID, DATE) TO authenticated;

-- Generate all routes for a business on a given date (matches day_of_week)
CREATE OR REPLACE FUNCTION public.generate_all_route_visits_for_date(
  p_business_id UUID,
  p_scheduled_date DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_route RECORD;
  v_count INTEGER := 0;
  v_dow day_of_week;
BEGIN
  IF p_business_id <> public.get_user_business_id() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  v_dow := CASE EXTRACT(DOW FROM p_scheduled_date)::INTEGER
    WHEN 0 THEN 'sunday'::day_of_week
    WHEN 1 THEN 'monday'::day_of_week
    WHEN 2 THEN 'tuesday'::day_of_week
    WHEN 3 THEN 'wednesday'::day_of_week
    WHEN 4 THEN 'thursday'::day_of_week
    WHEN 5 THEN 'friday'::day_of_week
    WHEN 6 THEN 'saturday'::day_of_week
  END;

  FOR v_route IN
    SELECT id FROM public.routes
    WHERE business_id = p_business_id AND day_of_week = v_dow AND is_active = true
  LOOP
    PERFORM public.generate_route_visits(v_route.id, p_scheduled_date);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_all_route_visits_for_date(UUID, DATE) TO authenticated;
