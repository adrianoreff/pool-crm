-- Internal chat messages per appointment (technician <-> office)
CREATE TABLE IF NOT EXISTS job_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('technician', 'admin', 'dispatcher', 'owner')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_messages_appointment_created ON job_messages(appointment_id, created_at);

ALTER TABLE job_messages ENABLE ROW LEVEL SECURITY;

-- Anyone in the same business as the appointment can read messages
CREATE POLICY "Users can view job messages for their business"
  ON job_messages FOR SELECT
  USING (
    appointment_id IN (
      SELECT a.id FROM appointments a
      WHERE a.business_id = public.get_user_business_id()
    )
  );

-- Technician assigned to the job, or owner/admin/dispatcher, can send messages
CREATE POLICY "Technician or office can insert job messages"
  ON job_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_id
        AND a.business_id = public.get_user_business_id()
        AND (
          a.technician_id = auth.uid()
          OR public.has_role('owner'::user_role)
          OR public.has_role('admin'::user_role)
          OR public.has_role('dispatcher'::user_role)
        )
    )
  );

-- Enable Realtime for job_messages (Supabase will broadcast INSERTs).
-- If this fails (e.g. publication not present), enable Realtime for job_messages in Dashboard: Database > Replication.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE job_messages;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL; -- ignore if already added or publication differs
END $$;
