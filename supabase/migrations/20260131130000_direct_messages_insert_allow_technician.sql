-- Allow technicians to send 1:1 replies: any user in the business can INSERT
-- a direct message to any other user in the same business (recipient_type = 'user').

DROP POLICY IF EXISTS "Users can send direct messages" ON direct_messages;
CREATE POLICY "Users can send direct messages"
  ON direct_messages FOR INSERT
  WITH CHECK (
    business_id = public.get_user_business_id()
    AND sender_id = auth.uid()
    AND (
      (recipient_type = 'office' AND recipient_id IS NULL)
      OR (recipient_type = 'user' AND recipient_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = recipient_id AND u.business_id = public.get_user_business_id()
      ))
    )
  );
