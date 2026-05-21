
-- 1) Restrict sensitive VAPI columns on businesses (column-level revoke)
REVOKE SELECT (vapi_api_key_encrypted, vapi_assistant_id, vapi_phone_number)
  ON public.businesses FROM anon, authenticated;

-- Provide a safe RPC for admins/owners to retrieve non-secret VAPI settings
CREATE OR REPLACE FUNCTION public.get_business_vapi_settings()
RETURNS TABLE(vapi_assistant_id text, vapi_phone_number text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role('admin'::user_role) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;
  RETURN QUERY
  SELECT b.vapi_assistant_id, b.vapi_phone_number
  FROM public.businesses b
  WHERE b.id = get_user_business_id();
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_business_vapi_settings() TO authenticated;

-- 2) Restrict direct_messages 'office' visibility to dispatcher+ roles
DROP POLICY IF EXISTS "Users can view direct messages in their business" ON public.direct_messages;
CREATE POLICY "Users can view direct messages in their business"
ON public.direct_messages
FOR SELECT
USING (
  business_id = get_user_business_id()
  AND (
    sender_id = auth.uid()
    OR recipient_id = auth.uid()
    OR (recipient_type = 'office' AND has_role('dispatcher'::user_role))
  )
);

-- 3) Restrict notification_recipients SELECT to admins/owners
DROP POLICY IF EXISTS "Users can view notification recipients" ON public.notification_recipients;
CREATE POLICY "Admins can view notification recipients"
ON public.notification_recipients
FOR SELECT
USING (business_id = get_user_business_id() AND has_role('admin'::user_role));

-- 4) Remove public read access on widget_config; edge functions use service role
DROP POLICY IF EXISTS "Public can read active widget config" ON public.widget_config;
