-- One active route stop per customer (prevents same pool on two technicians/routes)
-- Deactivate duplicate active stops before creating the index (keep newest per customer)
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY customer_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    ) AS rn
  FROM public.route_stops
  WHERE is_active = true
)
UPDATE public.route_stops rs
SET is_active = false, updated_at = NOW()
FROM ranked r
WHERE rs.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS route_stops_one_active_per_customer
  ON public.route_stops (customer_id)
  WHERE is_active = true;
