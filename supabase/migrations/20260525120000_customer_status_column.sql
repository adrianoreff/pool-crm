-- Explicit customer_status for Active / Lead / Inactive
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS customer_status TEXT NOT NULL DEFAULT 'active'
  CHECK (customer_status IN ('active', 'lead', 'inactive'));

-- Backfill from existing is_active, tags, notes, total_appointments
UPDATE public.customers c SET customer_status = 'inactive'
WHERE c.is_active = false;

UPDATE public.customers c SET customer_status = 'lead'
WHERE c.is_active IS DISTINCT FROM false
  AND c.customer_status = 'active'
  AND (
    EXISTS (
      SELECT 1 FROM unnest(COALESCE(c.tags, ARRAY[]::TEXT[])) t
      WHERE lower(t) = 'lead' OR lower(t) LIKE '%lead%'
    )
    OR lower(COALESCE(c.notes, '')) ~ '\mlead\M'
    OR lower(COALESCE(c.notes, '')) LIKE '%import status: lead%'
    OR COALESCE(c.total_appointments, 0) = 0
  );
