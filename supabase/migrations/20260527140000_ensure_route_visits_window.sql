-- Auto-schedule weekly route visits (replaces manual Generate stops flow)

-- Ensure visits for one date across all matching active routes for the business
CREATE OR REPLACE FUNCTION public.ensure_route_visits_for_date(p_scheduled_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_business_id UUID;
  v_count INTEGER;
BEGIN
  v_business_id := public.get_user_business_id();
  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Not signed in or business not set up';
  END IF;

  SELECT public.generate_all_route_visits_for_date(v_business_id, p_scheduled_date) INTO v_count;
  RETURN COALESCE(v_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_route_visits_for_date(DATE) TO authenticated;

-- Ensure visits for each matching weekday in the next N weeks (rolling window)
CREATE OR REPLACE FUNCTION public.ensure_route_visits_window(
  p_route_id UUID,
  p_weeks_ahead INTEGER DEFAULT 12
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_route public.routes%ROWTYPE;
  v_business_id UUID;
  v_dow INTEGER;
  v_weeks INTEGER;
  v_cursor DATE;
  v_end DATE;
  v_created INTEGER := 0;
  v_i INTEGER;
BEGIN
  v_weeks := GREATEST(1, LEAST(COALESCE(p_weeks_ahead, 12), 52));

  SELECT * INTO v_route FROM public.routes WHERE id = p_route_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Route not found';
  END IF;

  v_business_id := public.get_user_business_id();
  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Not signed in or business not set up';
  END IF;

  IF v_route.business_id IS DISTINCT FROM v_business_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF v_route.is_active = false THEN
    RETURN 0;
  END IF;

  v_dow := CASE v_route.day_of_week
    WHEN 'sunday' THEN 0
    WHEN 'monday' THEN 1
    WHEN 'tuesday' THEN 2
    WHEN 'wednesday' THEN 3
    WHEN 'thursday' THEN 4
    WHEN 'friday' THEN 5
    WHEN 'saturday' THEN 6
  END;

  v_cursor := CURRENT_DATE;
  WHILE EXTRACT(DOW FROM v_cursor)::INTEGER <> v_dow LOOP
    v_cursor := v_cursor + 1;
  END LOOP;

  v_end := CURRENT_DATE + (v_weeks * 7);

  WHILE v_cursor <= v_end LOOP
    PERFORM public.generate_route_visits(p_route_id, v_cursor);
    v_created := v_created + 1;
    v_cursor := v_cursor + 7;
  END LOOP;

  RETURN v_created;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_route_visits_window(UUID, INTEGER) TO authenticated;

-- Ensure all active routes for business over rolling window
CREATE OR REPLACE FUNCTION public.ensure_all_routes_visits_window(p_weeks_ahead INTEGER DEFAULT 12)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_business_id UUID;
  v_route RECORD;
  v_total INTEGER := 0;
BEGIN
  v_business_id := public.get_user_business_id();
  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Not signed in or business not set up';
  END IF;

  FOR v_route IN
    SELECT id FROM public.routes
    WHERE business_id = v_business_id AND is_active = true
  LOOP
    v_total := v_total + public.ensure_route_visits_window(v_route.id, p_weeks_ahead);
  END LOOP;

  RETURN v_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_all_routes_visits_window(INTEGER) TO authenticated;

-- Cancel future non-completed visits for a route stop (when removed from route)
CREATE OR REPLACE FUNCTION public.cancel_future_route_stop_appointments(
  p_route_stop_id UUID DEFAULT NULL,
  p_route_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_count INTEGER;
  v_business_id UUID;
BEGIN
  v_business_id := public.get_user_business_id();
  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Not signed in or business not set up';
  END IF;

  UPDATE public.appointments a
  SET
    status = 'cancelled',
    cancelled_at = NOW(),
    cancellation_reason = 'Removed from route',
    updated_at = NOW()
  WHERE a.business_id = v_business_id
    AND a.scheduled_date >= CURRENT_DATE
    AND a.status NOT IN ('completed', 'cancelled')
    AND (
      (p_route_stop_id IS NOT NULL AND a.route_stop_id = p_route_stop_id)
      OR (
        p_route_id IS NOT NULL
        AND a.route_stop_id IN (
          SELECT rs.id FROM public.route_stops rs WHERE rs.route_id = p_route_id
        )
      )
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_future_route_stop_appointments(UUID, UUID) TO authenticated;
