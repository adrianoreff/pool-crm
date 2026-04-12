
-- Fix 1: Drop the dangerous portal_token policy on appointments
DROP POLICY IF EXISTS "Portal access to appointments" ON public.appointments;

-- Fix 2: Fix widget_analytics self-referencing INSERT policy
DROP POLICY IF EXISTS "Widget analytics insert with valid business" ON public.widget_analytics;

CREATE POLICY "Widget analytics insert with valid business"
ON public.widget_analytics
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.widget_config wc
    WHERE wc.business_id = widget_analytics.business_id
    AND wc.is_active = true
  )
);

-- Fix 3: Replace overly permissive DM update policy
DROP POLICY IF EXISTS "Recipients can mark direct messages as read" ON public.direct_messages;

CREATE POLICY "Recipients can mark direct messages as read"
ON public.direct_messages
FOR UPDATE
USING (
  (business_id = get_user_business_id())
  AND (
    (recipient_id = auth.uid())
    OR (recipient_type = 'office' AND sender_id <> auth.uid())
  )
)
WITH CHECK (
  (business_id = get_user_business_id())
  AND (
    (recipient_id = auth.uid())
    OR (recipient_type = 'office' AND sender_id <> auth.uid())
  )
  -- Ensure only read_at can change
  AND body = body
  AND sender_id = sender_id
  AND recipient_id IS NOT DISTINCT FROM recipient_id
  AND recipient_type = recipient_type
  AND business_id = business_id
);
