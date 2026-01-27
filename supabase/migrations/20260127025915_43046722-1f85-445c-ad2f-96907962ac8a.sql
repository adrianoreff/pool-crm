-- Create function to get available time slots for a business on a given date
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_business_id UUID,
  p_date DATE,
  p_duration_minutes INTEGER DEFAULT 60
)
RETURNS TABLE (
  slot_time TIME,
  is_available BOOLEAN,
  technicians_available UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_of_week day_of_week;
  v_open_time TIME;
  v_close_time TIME;
  v_is_open BOOLEAN;
  v_slot_interval INTEGER;
  v_buffer_time INTEGER;
  v_current_slot TIME;
  v_slot_end TIME;
BEGIN
  -- Get day of week from date
  v_day_of_week := LOWER(TO_CHAR(p_date, 'fmday'))::day_of_week;
  
  -- Check for availability override first
  SELECT ao.is_open, ao.open_time, ao.close_time
  INTO v_is_open, v_open_time, v_close_time
  FROM availability_overrides ao
  WHERE ao.business_id = p_business_id
    AND ao.date = p_date;
  
  -- If no override, get regular operating hours
  IF NOT FOUND THEN
    SELECT oh.is_open, oh.open_time, oh.close_time
    INTO v_is_open, v_open_time, v_close_time
    FROM operating_hours oh
    WHERE oh.business_id = p_business_id
      AND oh.day_of_week = v_day_of_week;
  END IF;
  
  -- If closed or no hours found, return empty
  IF NOT FOUND OR NOT v_is_open OR v_open_time IS NULL OR v_close_time IS NULL THEN
    RETURN;
  END IF;
  
  -- Get booking rules
  SELECT COALESCE(br.time_slot_interval, 30), COALESCE(br.buffer_time, 15)
  INTO v_slot_interval, v_buffer_time
  FROM booking_rules br
  WHERE br.business_id = p_business_id;
  
  -- Default values if no booking rules
  IF NOT FOUND THEN
    v_slot_interval := 30;
    v_buffer_time := 15;
  END IF;
  
  -- Generate time slots
  v_current_slot := v_open_time;
  
  WHILE v_current_slot + (p_duration_minutes || ' minutes')::INTERVAL <= v_close_time LOOP
    v_slot_end := v_current_slot + (p_duration_minutes || ' minutes')::INTERVAL;
    
    -- Find available technicians for this slot
    SELECT 
      CASE 
        WHEN COUNT(*) > 0 THEN TRUE 
        ELSE FALSE 
      END,
      ARRAY_AGG(u.id) FILTER (WHERE u.id IS NOT NULL)
    INTO is_available, technicians_available
    FROM users u
    WHERE u.business_id = p_business_id
      AND u.role = 'technician'
      AND u.is_active = TRUE
      -- Not blocked by technician_availability
      AND NOT EXISTS (
        SELECT 1 FROM technician_availability ta
        WHERE ta.technician_id = u.id
          AND ta.date = p_date
          AND ta.is_available = FALSE
      )
      -- Not already booked for this time
      AND NOT EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.technician_id = u.id
          AND a.scheduled_date = p_date
          AND a.status NOT IN ('cancelled', 'no_show')
          AND (
            -- Check for overlap with buffer
            (a.scheduled_start_time - (v_buffer_time || ' minutes')::INTERVAL, 
             a.scheduled_end_time + (v_buffer_time || ' minutes')::INTERVAL)
            OVERLAPS
            (v_current_slot, v_slot_end)
          )
      );
    
    slot_time := v_current_slot;
    
    -- If no technicians, still return the slot but mark as unavailable
    IF technicians_available IS NULL THEN
      technicians_available := ARRAY[]::UUID[];
    END IF;
    
    RETURN NEXT;
    
    -- Move to next slot
    v_current_slot := v_current_slot + (v_slot_interval || ' minutes')::INTERVAL;
  END LOOP;
  
  RETURN;
END;
$$;