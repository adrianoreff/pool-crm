-- Read receipts for job chat: when a user last read messages for an appointment
CREATE TABLE IF NOT EXISTS job_chat_read_receipts (
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (appointment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_job_chat_read_receipts_user ON job_chat_read_receipts(user_id);

ALTER TABLE job_chat_read_receipts ENABLE ROW LEVEL SECURITY;

-- Users can see receipts for appointments they have access to (same business or assigned tech)
CREATE POLICY "Users can view read receipts for their appointments"
  ON job_chat_read_receipts FOR SELECT
  USING (
    appointment_id IN (
      SELECT a.id FROM appointments a
      WHERE a.business_id = public.get_user_business_id()
    )
  );

-- Users can insert/update their own receipt for appointments in their business
CREATE POLICY "Users can upsert own read receipt"
  ON job_chat_read_receipts FOR ALL
  USING (
    user_id = auth.uid()
    AND appointment_id IN (
      SELECT a.id FROM appointments a
      WHERE a.business_id = public.get_user_business_id()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND appointment_id IN (
      SELECT a.id FROM appointments a
      WHERE a.business_id = public.get_user_business_id()
    )
  );
