-- Allow participants to delete messages (for "clear chat" and single-message delete).

-- job_messages: anyone who can view (same business, appointment visible) can delete
CREATE POLICY "Users can delete job messages in their business"
  ON job_messages FOR DELETE
  USING (
    appointment_id IN (
      SELECT a.id FROM appointments a
      WHERE a.business_id = public.get_user_business_id()
    )
  );

-- direct_messages: sender or recipient can delete (participant in thread)
CREATE POLICY "Participants can delete direct messages"
  ON direct_messages FOR DELETE
  USING (
    business_id = public.get_user_business_id()
    AND (sender_id = auth.uid() OR recipient_id = auth.uid())
  );
