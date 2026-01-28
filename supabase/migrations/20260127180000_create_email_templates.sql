-- Create email_templates table for managing customizable email templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('customer', 'admin', 'technician', 'custom')),
  trigger_event TEXT,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('customer', 'admin', 'technician')),
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, slug)
);

-- Create index for faster lookups
CREATE INDEX idx_email_templates_business_id ON email_templates(business_id);
CREATE INDEX idx_email_templates_slug ON email_templates(slug);
CREATE INDEX idx_email_templates_category ON email_templates(category);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view templates for their business
CREATE POLICY "Users can view email templates for their business"
  ON email_templates FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Admins and owners can insert templates
CREATE POLICY "Admins can insert email templates"
  ON email_templates FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Policy: Admins and owners can update templates
CREATE POLICY "Admins can update email templates"
  ON email_templates FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Policy: Admins and owners can delete non-default templates
CREATE POLICY "Admins can delete custom email templates"
  ON email_templates FOR DELETE
  USING (
    is_default = false AND
    business_id IN (
      SELECT business_id FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_templates_updated_at();

-- Insert default templates for new businesses (function to be called on business creation or manually)
-- Note: These templates use {{variable}} syntax for dynamic content replacement

-- Default Customer Templates
INSERT INTO email_templates (business_id, name, slug, description, category, trigger_event, recipient_type, subject, body_html, is_default)
SELECT 
  b.id,
  'Booking Request Received',
  'appointment_request_received',
  'Sent when a new booking request is received',
  'customer',
  'appointment_request_received',
  'customer',
  'We Received Your Service Request - {{business_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #F97316; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin:0;">Request Received 📋</h1>
    </div>
    <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5;">
      <p>Hi {{customer_name}},</p>
      <p>Thanks for contacting <strong>{{business_name}}</strong>. We received your request and we are reviewing it now.</p>
      <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p><strong>Service:</strong> {{service_name}}</p>
        <p><strong>Preferred Date:</strong> {{appointment_date}} ({{appointment_time}})</p>
        <p><strong>Reference:</strong> {{appointment_id}}</p>
      </div>
      <p>During business hours, this usually takes just a few minutes.</p>
      <p>Questions? Call us at <strong>{{business_phone}}</strong>.</p>
    </div>
    <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px;">
      <p>{{business_name}} | {{business_phone}}</p>
    </div>
  </div>',
  true
FROM businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates et 
  WHERE et.business_id = b.id AND et.slug = 'appointment_request_received'
);

INSERT INTO email_templates (business_id, name, slug, description, category, trigger_event, recipient_type, subject, body_html, is_default)
SELECT 
  b.id,
  'Appointment Confirmed',
  'appointment_confirmation',
  'Sent when an appointment is confirmed by admin',
  'customer',
  'appointment_confirmation',
  'customer',
  '✅ Appointment Confirmed - {{appointment_date}} - {{business_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #16A34A; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin:0;">Appointment Confirmed! ✓</h1>
    </div>
    <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5;">
      <p>Hi {{customer_name}},</p>
      <p>Great news! Your appointment has been confirmed.</p>
      <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <div style="text-align: center; margin-bottom: 15px;">
          <div style="font-size: 12px; color: #666;">REFERENCE CODE</div>
          <div style="font-size: 24px; font-weight: bold; color: #F97316; letter-spacing: 2px;">{{appointment_id}}</div>
        </div>
        <p><strong>📅 Date:</strong> {{appointment_date}}</p>
        <p><strong>🕐 Time:</strong> {{appointment_time}}</p>
        <p><strong>🔧 Service:</strong> {{service_name}}</p>
        <p><strong>📍 Address:</strong> {{customer_address}}</p>
        {{#if technician_name}}<p><strong>👨‍🔧 Technician:</strong> {{technician_name}}</p>{{/if}}
      </div>
      <p><strong>What to expect:</strong></p>
      <ul>
        <li>Our technician will call you ~30 minutes before arrival</li>
        <li>You''ll receive a reminder before your appointment</li>
        <li>Please ensure someone 18+ is present</li>
      </ul>
      <p>Questions? Call us at <strong>{{business_phone}}</strong></p>
    </div>
    <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px;">
      <p>{{business_name}} | {{business_phone}}</p>
    </div>
  </div>',
  true
FROM businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates et 
  WHERE et.business_id = b.id AND et.slug = 'appointment_confirmation'
);

INSERT INTO email_templates (business_id, name, slug, description, category, trigger_event, recipient_type, subject, body_html, is_default)
SELECT 
  b.id,
  'Appointment Rescheduled',
  'appointment_rescheduled',
  'Sent when appointment date/time is changed',
  'customer',
  'appointment_rescheduled',
  'customer',
  '📅 Appointment Rescheduled - {{appointment_date}} - {{business_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #2563EB; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin:0;">📅 Appointment Rescheduled</h1>
    </div>
    <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5;">
      <p>Hi {{customer_name}},</p>
      <p>Your appointment has been rescheduled. Here are the new details:</p>
      <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p><strong>📅 New Date:</strong> {{appointment_date}}</p>
        <p><strong>🕐 New Time:</strong> {{appointment_time}}</p>
        <p><strong>🔧 Service:</strong> {{service_name}}</p>
        <p><strong>📍 Address:</strong> {{customer_address}}</p>
        <p><strong>🏷️ Reference:</strong> {{appointment_id}}</p>
      </div>
      <p>If this doesn''t work, please call us at <strong>{{business_phone}}</strong>.</p>
    </div>
    <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px;">
      <p>{{business_name}} | {{business_phone}}</p>
    </div>
  </div>',
  true
FROM businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates et 
  WHERE et.business_id = b.id AND et.slug = 'appointment_rescheduled'
);

INSERT INTO email_templates (business_id, name, slug, description, category, trigger_event, recipient_type, subject, body_html, is_default)
SELECT 
  b.id,
  'Appointment Cancelled',
  'appointment_cancelled',
  'Sent when an appointment is cancelled',
  'customer',
  'appointment_cancelled',
  'customer',
  'Appointment Cancelled - {{appointment_id}} - {{business_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #6B7280; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin:0;">Appointment Cancelled</h1>
    </div>
    <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5;">
      <p>Hi {{customer_name}},</p>
      <p>Your appointment has been cancelled.</p>
      <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="text-decoration: line-through; opacity: 0.7;"><strong>{{appointment_date}}</strong> at {{appointment_time}}</p>
        <p><strong>Service:</strong> {{service_name}}</p>
        <p><strong>Reference:</strong> {{appointment_id}}</p>
      </div>
      <p>We''d love to help you in the future! Call us at <strong>{{business_phone}}</strong> to reschedule.</p>
    </div>
    <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px;">
      <p>{{business_name}} | {{business_phone}}</p>
    </div>
  </div>',
  true
FROM businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates et 
  WHERE et.business_id = b.id AND et.slug = 'appointment_cancelled'
);

INSERT INTO email_templates (business_id, name, slug, description, category, trigger_event, recipient_type, subject, body_html, is_default)
SELECT 
  b.id,
  'Appointment Reminder',
  'appointment_reminder',
  'Sent 24 hours before the appointment',
  'customer',
  'appointment_reminder',
  'customer',
  '📅 Reminder: Your Appointment Tomorrow - {{business_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #F97316; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin:0;">📅 Appointment Reminder</h1>
    </div>
    <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5;">
      <p>Hi {{customer_name}},</p>
      <p>This is a friendly reminder about your upcoming appointment:</p>
      <div style="background: #FFF7ED; border: 1px solid #FDBA74; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
        <div style="font-size: 28px; font-weight: bold; color: #F97316;">{{appointment_date}}</div>
        <div style="font-size: 20px; color: #666;">{{appointment_time}}</div>
        <hr style="margin: 15px 0; border: none; border-top: 1px solid #FDBA74;">
        <p><strong>Service:</strong> {{service_name}}</p>
        <p><strong>Address:</strong> {{customer_address}}</p>
        <p><strong>Reference:</strong> {{appointment_id}}</p>
      </div>
      <p><strong>Please remember:</strong></p>
      <ul>
        <li>Someone 18+ should be present</li>
        <li>Clear access to the work area if possible</li>
      </ul>
      <p>Need to reschedule? Call us at <strong>{{business_phone}}</strong>.</p>
    </div>
    <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px;">
      <p>{{business_name}} | {{business_phone}}</p>
    </div>
  </div>',
  true
FROM businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates et 
  WHERE et.business_id = b.id AND et.slug = 'appointment_reminder'
);

INSERT INTO email_templates (business_id, name, slug, description, category, trigger_event, recipient_type, subject, body_html, is_default)
SELECT 
  b.id,
  'Service Completed',
  'appointment_completed',
  'Sent when the service is marked as completed',
  'customer',
  'appointment_completed',
  'customer',
  '✓ Service Completed - Thank You! - {{business_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #16A34A; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin:0;">✓ Service Completed</h1>
    </div>
    <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5;">
      <p>Hi {{customer_name}},</p>
      <p>Thank you for choosing us! Your service has been completed.</p>
      <p>If you have any questions or need further assistance, please don''t hesitate to contact us.</p>
      <p>We''d love to hear your feedback!</p>
      <p>Best regards,<br>{{business_name}}</p>
    </div>
    <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px;">
      <p>{{business_name}} | {{business_phone}}</p>
    </div>
  </div>',
  true
FROM businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates et 
  WHERE et.business_id = b.id AND et.slug = 'appointment_completed'
);

-- Default Admin Templates
INSERT INTO email_templates (business_id, name, slug, description, category, trigger_event, recipient_type, subject, body_html, is_default)
SELECT 
  b.id,
  'New Booking Alert',
  'admin_new_appointment',
  'Sent to admin when a new booking is received',
  'admin',
  'admin_new_appointment',
  'admin',
  '📬 New Appointment Request - {{appointment_id}} - {{business_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #F97316; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin:0;">📬 New Appointment</h1>
    </div>
    <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5;">
      <p><strong>Customer:</strong> {{customer_name}}</p>
      <p><strong>Phone:</strong> {{customer_phone}}</p>
      <p><strong>Email:</strong> {{customer_email}}</p>
      <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p><strong>Reference:</strong> {{appointment_id}}</p>
        <p><strong>Date:</strong> {{appointment_date}}</p>
        <p><strong>Time:</strong> {{appointment_time}}</p>
        <p><strong>Service:</strong> {{service_name}}</p>
        <p><strong>Address:</strong> {{customer_address}}</p>
      </div>
      <p>Open the dashboard to confirm and assign a technician.</p>
    </div>
    <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px;">
      <p>{{business_name}} | {{business_phone}}</p>
    </div>
  </div>',
  true
FROM businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates et 
  WHERE et.business_id = b.id AND et.slug = 'admin_new_appointment'
);

INSERT INTO email_templates (business_id, name, slug, description, category, trigger_event, recipient_type, subject, body_html, is_default)
SELECT 
  b.id,
  'Confirmation Recorded',
  'admin_confirmation_recorded',
  'Sent to admin when they confirm an appointment',
  'admin',
  'admin_confirmation_recorded',
  'admin',
  '✅ Appointment Confirmed - {{customer_name}} on {{appointment_date}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #16A34A; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin:0;">Appointment Confirmed</h1>
    </div>
    <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5;">
      <p>You have confirmed the following appointment:</p>
      <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p><strong>Customer:</strong> {{customer_name}}</p>
        <p><strong>Service:</strong> {{service_name}}</p>
        <p><strong>Date:</strong> {{appointment_date}} at {{appointment_time}}</p>
        <p><strong>Address:</strong> {{customer_address}}</p>
        {{#if technician_name}}<p><strong>Technician:</strong> {{technician_name}}</p>{{else}}<p style="color: #f97316;"><strong>⚠️ No technician assigned yet</strong></p>{{/if}}
      </div>
      <p>This is a confirmation for your records.</p>
    </div>
    <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px;">
      <p>{{business_name}} | {{business_phone}}</p>
    </div>
  </div>',
  true
FROM businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates et 
  WHERE et.business_id = b.id AND et.slug = 'admin_confirmation_recorded'
);

-- Default Technician Templates
INSERT INTO email_templates (business_id, name, slug, description, category, trigger_event, recipient_type, subject, body_html, is_default)
SELECT 
  b.id,
  'New Job Assigned',
  'technician_assigned',
  'Sent to technician when assigned to a job',
  'technician',
  'technician_assigned',
  'technician',
  '🔧 New Job Assigned - {{customer_name}} on {{appointment_date}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #F97316; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin:0;">New Job Assigned</h1>
    </div>
    <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5;">
      <p>A new job has been assigned to you:</p>
      <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p><strong>Customer:</strong> {{customer_name}}</p>
        <p><strong>Service:</strong> {{service_name}}</p>
        <p><strong>Date:</strong> {{appointment_date}} at {{appointment_time}}</p>
        <p><strong>Address:</strong> {{customer_address}}</p>
        {{#if appointment_notes}}<p><strong>Notes:</strong> {{appointment_notes}}</p>{{/if}}
      </div>
      <p>Log in to the technician portal to view job details.</p>
      <p style="color: #666; font-size: 14px; margin-top: 20px;">You can view all your assigned jobs in the Technician Portal.</p>
    </div>
    <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px;">
      <p>{{business_name}} | {{business_phone}}</p>
    </div>
  </div>',
  true
FROM businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates et 
  WHERE et.business_id = b.id AND et.slug = 'technician_assigned'
);
