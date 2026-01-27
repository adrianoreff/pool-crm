-- Add technician-specific fields to appointments table
ALTER TABLE appointments 
  ADD COLUMN IF NOT EXISTS work_summary TEXT,
  ADD COLUMN IF NOT EXISTS technician_notes TEXT,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS time_spent_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS en_route_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_started_at ON appointments(started_at);
CREATE INDEX IF NOT EXISTS idx_appointments_completed_at ON appointments(completed_at);
CREATE INDEX IF NOT EXISTS idx_appointments_technician_date ON appointments(technician_id, scheduled_date);
