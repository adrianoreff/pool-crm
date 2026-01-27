-- Create email_logs table for tracking all sent emails
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  -- Email details
  email_type TEXT NOT NULL, -- appointment_confirmed, reminder_24h, etc.
  recipient_type TEXT NOT NULL, -- customer, technician, admin
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  
  -- Related records
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Resend tracking
  resend_id TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'queued', -- queued, sent, delivered, opened, clicked, bounced, failed
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_email_logs_business ON public.email_logs(business_id);
CREATE INDEX idx_email_logs_appointment ON public.email_logs(appointment_id);
CREATE INDEX idx_email_logs_customer ON public.email_logs(customer_id);
CREATE INDEX idx_email_logs_status ON public.email_logs(status);
CREATE INDEX idx_email_logs_type ON public.email_logs(email_type);
CREATE INDEX idx_email_logs_created ON public.email_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view email logs for their business"
ON public.email_logs FOR SELECT
USING (business_id = get_user_business_id());

CREATE POLICY "Users can insert email logs for their business"
ON public.email_logs FOR INSERT
WITH CHECK (business_id = get_user_business_id() OR auth.role() = 'service_role');

-- Add trigger for updated_at
CREATE TRIGGER update_email_logs_updated_at
BEFORE UPDATE ON public.email_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();