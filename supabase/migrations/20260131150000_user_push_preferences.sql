-- User push notification preferences (per user, per business).
-- Controls which push notification types each user receives.

CREATE TABLE user_push_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Admin/office: receive these when user has office role
  push_new_appointment BOOLEAN DEFAULT true,
  push_cancellation BOOLEAN DEFAULT true,
  push_reschedule BOOLEAN DEFAULT true,
  push_chat_direct BOOLEAN DEFAULT true,
  push_chat_job BOOLEAN DEFAULT true,
  push_job_problem BOOLEAN DEFAULT true,

  -- Technician: receive these when user is (also) technician
  push_assigned BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, business_id)
);

CREATE INDEX idx_user_push_preferences_user ON user_push_preferences(user_id);
CREATE INDEX idx_user_push_preferences_business ON user_push_preferences(business_id);

ALTER TABLE user_push_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own push preferences"
  ON user_push_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push preferences"
  ON user_push_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push preferences"
  ON user_push_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE user_push_preferences IS 'Per-user, per-business toggles for which push notification types to receive.';
