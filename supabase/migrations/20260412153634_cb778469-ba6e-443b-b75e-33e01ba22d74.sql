-- Fix 1: Drop broken DM UPDATE policy and replace with RPC function
DROP POLICY IF EXISTS "Recipients can mark direct messages as read" ON public.direct_messages;

CREATE OR REPLACE FUNCTION public.mark_dm_read(p_message_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.direct_messages
  SET read_at = now()
  WHERE id = ANY(p_message_ids)
    AND read_at IS NULL
    AND business_id = get_user_business_id()
    AND (
      -- Direct message where caller is the recipient
      (recipient_id = auth.uid())
      -- Or office channel message not sent by the caller
      OR (recipient_type = 'office' AND sender_id <> auth.uid())
    );
END;
$$;

-- Fix 2: Fix mutable search_path on update_email_templates_updated_at
CREATE OR REPLACE FUNCTION public.update_email_templates_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;