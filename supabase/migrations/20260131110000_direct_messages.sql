-- Direct messages: office <-> technician without requiring an appointment
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('user', 'office')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_business_created ON direct_messages(business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient ON direct_messages(recipient_id, created_at) WHERE recipient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON direct_messages(sender_id, created_at);

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: same business; and (I am sender, or I am recipient, or message is to office and I am office)
CREATE POLICY "Users can view direct messages in their business"
  ON direct_messages FOR SELECT
  USING (
    business_id = public.get_user_business_id()
    AND (
      sender_id = auth.uid()
      OR recipient_id = auth.uid()
      OR (recipient_type = 'office' AND (public.has_role('owner'::user_role) OR public.has_role('admin'::user_role) OR public.has_role('dispatcher'::user_role)))
    )
  );

-- INSERT: technician can send to office (recipient_type=office, recipient_id=null); office can send to technician (recipient_type=user, recipient_id=tech)
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
      ) AND (public.has_role('owner'::user_role) OR public.has_role('admin'::user_role) OR public.has_role('dispatcher'::user_role)))
    )
  );

-- UPDATE: only to set read_at; recipient can mark as read
CREATE POLICY "Recipients can mark direct messages as read"
  ON direct_messages FOR UPDATE
  USING (
    business_id = public.get_user_business_id()
    AND (recipient_id = auth.uid() OR (recipient_type = 'office' AND (public.has_role('owner'::user_role) OR public.has_role('admin'::user_role) OR public.has_role('dispatcher'::user_role))))
  )
  WITH CHECK (true);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
