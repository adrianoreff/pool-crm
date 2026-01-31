-- Allow all users in the business (including technicians) to see and mark as read
-- office channel messages (recipient_type = 'office'), so admin replies reach every technician
-- regardless of past/current jobs.

DROP POLICY IF EXISTS "Users can view direct messages in their business" ON direct_messages;
CREATE POLICY "Users can view direct messages in their business"
  ON direct_messages FOR SELECT
  USING (
    business_id = public.get_user_business_id()
    AND (
      sender_id = auth.uid()
      OR recipient_id = auth.uid()
      OR recipient_type = 'office'
    )
  );

-- Technicians can mark office channel messages as read (recipient_id is null for office channel)
DROP POLICY IF EXISTS "Recipients can mark direct messages as read" ON direct_messages;
CREATE POLICY "Recipients can mark direct messages as read"
  ON direct_messages FOR UPDATE
  USING (
    business_id = public.get_user_business_id()
    AND (
      recipient_id = auth.uid()
      OR (recipient_type = 'office' AND sender_id <> auth.uid())
    )
  )
  WITH CHECK (true);
