-- Fix ambiguous customer_id (RETURNS TABLE column vs table columns)

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
#variable_conflict use_variable
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
  v_out_customer_id UUID;
BEGIN
  SELECT * INTO v_route FROM public.routes WHERE id = p_route_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Route not found';
  END IF;

  IF public.get_user_business_id() IS NULL THEN
    RAISE EXCEPTION 'Not signed in or business not set up';
  END IF;

  IF v_route.business_id IS DISTINCT FROM public.get_user_business_id() THEN
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

  IF v_service_id IS NULL THEN
    PERFORM public.seed_pool_business_defaults(v_route.business_id);
    SELECT s.id INTO v_service_id
    FROM public.services s
    JOIN public.service_categories sc ON sc.id = s.category_id
    WHERE s.business_id = v_route.business_id
      AND sc.slug = 'pool'
      AND s.is_active = true
    ORDER BY s.created_at
    LIMIT 1;
  END IF;

  FOR v_stop IN
    SELECT rs.id AS stop_id,
           rs.customer_id AS stop_customer_id,
           rs.address_id AS stop_address_id,
           rs.sort_order,
           c.first_name,
           c.last_name,
           c.email,
           c.phone
    FROM public.route_stops rs
    JOIN public.customers c ON c.id = rs.customer_id
    WHERE rs.route_id = p_route_id AND rs.is_active = true
    ORDER BY rs.sort_order
  LOOP
    v_out_customer_id := v_stop.stop_customer_id;

    SELECT EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.route_stop_id = v_stop.stop_id
        AND a.scheduled_date = p_scheduled_date
        AND a.status <> 'cancelled'
    ) INTO v_exists;

    IF v_exists THEN
      SELECT a.id INTO v_appt_id
      FROM public.appointments a
      WHERE a.route_stop_id = v_stop.stop_id
        AND a.scheduled_date = p_scheduled_date
        AND a.status <> 'cancelled'
      LIMIT 1;
      appointment_id := v_appt_id;
      customer_id := v_out_customer_id;
      created := false;
      RETURN NEXT;
      CONTINUE;
    END IF;

    v_address := NULL;
    v_city := NULL;
    v_state := NULL;
    v_zip := NULL;
    v_lat := NULL;
    v_lng := NULL;

    SELECT ca.address, ca.city, ca.state, ca.zip_code, ca.latitude::double precision, ca.longitude::double precision
    INTO v_address, v_city, v_state, v_zip, v_lat, v_lng
    FROM public.customer_addresses ca
    WHERE ca.id = COALESCE(v_stop.stop_address_id, (
      SELECT ca2.id FROM public.customer_addresses ca2
      WHERE ca2.customer_id = v_stop.stop_customer_id AND ca2.is_primary = true
      LIMIT 1
    ))
    LIMIT 1;

    IF v_address IS NULL THEN
      SELECT ca.address, ca.city, ca.state, ca.zip_code, ca.latitude::double precision, ca.longitude::double precision
      INTO v_address, v_city, v_state, v_zip, v_lat, v_lng
      FROM public.customer_addresses ca
      WHERE ca.customer_id = v_stop.stop_customer_id
      ORDER BY ca.is_primary DESC NULLS LAST
      LIMIT 1;
    END IF;

    IF v_address IS NULL OR trim(v_address) = '' THEN
      SELECT c.address, c.city, c.state, c.zip_code, c.latitude::double precision, c.longitude::double precision
      INTO v_address, v_city, v_state, v_zip, v_lat, v_lng
      FROM public.customers c
      WHERE c.id = v_stop.stop_customer_id;
    END IF;

    IF v_address IS NULL OR trim(v_address) = '' THEN
      v_address := 'Address required';
    END IF;

    BEGIN
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
        v_stop.stop_customer_id,
        v_route.technician_id,
        v_service_id,
        v_stop.stop_id,
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
        'route'::appointment_source
      )
      RETURNING id INTO v_appt_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed creating visit for % %: %',
        v_stop.first_name, v_stop.last_name, SQLERRM;
    END;

    appointment_id := v_appt_id;
    customer_id := v_out_customer_id;
    created := true;
    RETURN NEXT;
  END LOOP;

  INSERT INTO public.route_day_stats (route_id, stats_date, total_stops, completed_stops, skipped_stops)
  SELECT p_route_id, p_scheduled_date,
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE a.status = 'completed')::INTEGER,
    COUNT(*) FILTER (WHERE a.status = 'no_show')::INTEGER
  FROM public.appointments a
  WHERE a.route_stop_id IN (
    SELECT rs.id FROM public.route_stops rs
    WHERE rs.route_id = p_route_id AND rs.is_active = true
  )
    AND a.scheduled_date = p_scheduled_date
  ON CONFLICT (route_id, stats_date) DO UPDATE SET
    total_stops = EXCLUDED.total_stops,
    completed_stops = EXCLUDED.completed_stops,
    skipped_stops = EXCLUDED.skipped_stops,
    updated_at = NOW();
END;
$$;
