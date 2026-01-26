-- ============================================
-- TradeFlow CRM - Phase 2: Complete Database Schema
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. Custom Types/Enums
-- ============================================

CREATE TYPE user_role AS ENUM ('owner', 'admin', 'dispatcher', 'technician');
CREATE TYPE appointment_status AS ENUM ('pending_confirmation', 'scheduled', 'in_progress', 'completed', 'cancelled', 'no_show');
CREATE TYPE appointment_source AS ENUM ('ai_call', 'widget', 'manual', 'phone');
CREATE TYPE call_outcome AS ENUM ('booked', 'rescheduled', 'cancelled', 'faq_answered', 'no_action', 'missed', 'voicemail');
CREATE TYPE day_of_week AS ENUM ('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday');
CREATE TYPE notification_type AS ENUM ('email', 'sms', 'push');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');

-- ============================================
-- 2. Core Tables
-- ============================================

-- Businesses (Tenants)
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  phone TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'US',
  timezone TEXT DEFAULT 'America/Chicago',
  logo_url TEXT,
  
  -- VAPI Integration
  vapi_assistant_id TEXT,
  vapi_phone_number TEXT,
  vapi_api_key_encrypted TEXT,
  
  -- Settings
  settings JSONB DEFAULT '{}'::jsonb,
  
  -- Subscription
  subscription_status TEXT DEFAULT 'trial',
  subscription_ends_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_businesses_slug ON businesses(slug);

-- Users (Team Members)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  
  role user_role NOT NULL DEFAULT 'technician',
  
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  
  preferences JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  
  UNIQUE(business_id, email)
);

CREATE INDEX idx_users_business ON users(business_id);
CREATE INDEX idx_users_email ON users(email);

-- Team Invitations
CREATE TABLE team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'technician',
  invited_by UUID REFERENCES users(id),
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(business_id, email)
);

-- ============================================
-- 3. Services & Categories
-- ============================================

CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(business_id, slug)
);

CREATE INDEX idx_service_categories_business ON service_categories(business_id);

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  
  duration_min INTEGER,
  duration_max INTEGER,
  
  base_price_min DECIMAL(10,2),
  base_price_max DECIMAL(10,2),
  
  ai_description TEXT,
  
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_services_business ON services(business_id);
CREATE INDEX idx_services_category ON services(category_id);

-- ============================================
-- 4. Customers
-- ============================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT NOT NULL,
  
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  
  notes TEXT,
  tags TEXT[],
  
  source appointment_source,
  source_call_id UUID,
  
  total_appointments INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  last_appointment_at TIMESTAMPTZ,
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_business ON customers(business_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_search ON customers USING gin(
  to_tsvector('english', coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(phone, ''))
);

CREATE TABLE customer_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  label TEXT,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  
  is_primary BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customer_addresses_customer ON customer_addresses(customer_id);

-- ============================================
-- 5. Appointments
-- ============================================

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  scheduled_date DATE NOT NULL,
  scheduled_start_time TIME NOT NULL,
  scheduled_end_time TIME NOT NULL,
  
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  
  status appointment_status NOT NULL DEFAULT 'pending_confirmation',
  
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  
  customer_notes TEXT,
  internal_notes TEXT,
  
  source appointment_source NOT NULL DEFAULT 'manual',
  source_call_id UUID,
  
  ref_code TEXT UNIQUE,
  portal_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES users(id),
  
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES users(id),
  cancellation_reason TEXT,
  
  invoice_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appointments_business ON appointments(business_id);
CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_technician ON appointments(technician_id);
CREATE INDEX idx_appointments_date ON appointments(scheduled_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_ref_code ON appointments(ref_code);
CREATE INDEX idx_appointments_portal_token ON appointments(portal_token);

CREATE TABLE appointment_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  
  action TEXT NOT NULL,
  description TEXT,
  
  old_value JSONB,
  new_value JSONB,
  
  performed_by UUID REFERENCES users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appointment_activity ON appointment_activity(appointment_id);

CREATE TABLE appointment_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appointment_photos ON appointment_photos(appointment_id);

-- ============================================
-- 6. VAPI Call Logs
-- ============================================

CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  vapi_call_id TEXT UNIQUE NOT NULL,
  vapi_assistant_id TEXT,
  
  caller_phone TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  outcome call_outcome,
  
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  
  transcript TEXT,
  summary TEXT,
  recording_url TEXT,
  
  extracted_data JSONB,
  vapi_data JSONB,
  
  processed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_logs_business ON call_logs(business_id);
CREATE INDEX idx_call_logs_vapi_call_id ON call_logs(vapi_call_id);
CREATE INDEX idx_call_logs_caller_phone ON call_logs(caller_phone);
CREATE INDEX idx_call_logs_customer ON call_logs(customer_id);
CREATE INDEX idx_call_logs_started_at ON call_logs(started_at);

CREATE TABLE call_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_log_id UUID NOT NULL REFERENCES call_logs(id) ON DELETE CASCADE,
  
  role TEXT NOT NULL,
  content TEXT,
  
  tool_name TEXT,
  tool_arguments JSONB,
  tool_result JSONB,
  
  timestamp TIMESTAMPTZ NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_messages_call ON call_messages(call_log_id);

-- ============================================
-- 7. Scheduling & Availability
-- ============================================

CREATE TABLE operating_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  day_of_week day_of_week NOT NULL,
  
  is_open BOOLEAN DEFAULT true,
  open_time TIME,
  close_time TIME,
  
  UNIQUE(business_id, day_of_week)
);

CREATE TABLE booking_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID UNIQUE NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  time_slot_interval INTEGER DEFAULT 30,
  buffer_time INTEGER DEFAULT 15,
  advance_booking_days INTEGER DEFAULT 30,
  minimum_notice_hours INTEGER DEFAULT 2,
  
  allow_same_day BOOLEAN DEFAULT true,
  allow_emergency BOOLEAN DEFAULT true,
  emergency_surcharge DECIMAL(10,2) DEFAULT 0,
  
  cancellation_policy TEXT,
  cancellation_notice_hours INTEGER DEFAULT 24,
  
  auto_confirm BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE technician_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  date DATE NOT NULL,
  
  is_available BOOLEAN DEFAULT true,
  start_time TIME,
  end_time TIME,
  
  reason TEXT,
  
  UNIQUE(technician_id, date)
);

CREATE INDEX idx_technician_availability ON technician_availability(technician_id, date);

CREATE TABLE availability_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  date DATE NOT NULL,
  
  is_open BOOLEAN DEFAULT false,
  open_time TIME,
  close_time TIME,
  
  reason TEXT,
  
  UNIQUE(business_id, date)
);

CREATE INDEX idx_availability_overrides ON availability_overrides(business_id, date);

-- ============================================
-- 8. Service Areas
-- ============================================

CREATE TABLE service_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  
  zip_codes TEXT[] NOT NULL DEFAULT '{}',
  geojson JSONB,
  
  default_technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  travel_surcharge DECIMAL(10,2) DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_service_areas_business ON service_areas(business_id);
CREATE INDEX idx_service_areas_zip ON service_areas USING gin(zip_codes);

-- ============================================
-- 9. Invoices
-- ============================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  
  invoice_number TEXT UNIQUE,
  
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  
  status invoice_status NOT NULL DEFAULT 'draft',
  
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  paid_amount DECIMAL(10,2) DEFAULT 0,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_business ON invoices(business_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_appointment ON invoices(appointment_id);

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_invoice_items ON invoice_items(invoice_id);

-- Add invoice reference to appointments
ALTER TABLE appointments 
  ADD CONSTRAINT fk_appointments_invoice 
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

-- ============================================
-- 10. Notifications
-- ============================================

CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  
  email_subject TEXT,
  email_body TEXT,
  
  sms_body TEXT,
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(business_id, name)
);

CREATE TABLE notification_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  email TEXT NOT NULL,
  name TEXT,
  
  notify_new_appointment BOOLEAN DEFAULT true,
  notify_cancellation BOOLEAN DEFAULT true,
  notify_daily_summary BOOLEAN DEFAULT true,
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_recipients ON notification_recipients(business_id);

CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  type notification_type NOT NULL,
  template_name TEXT,
  
  recipient_email TEXT,
  recipient_phone TEXT,
  
  subject TEXT,
  body TEXT,
  
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  
  resend_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_log_business ON notification_log(business_id);
CREATE INDEX idx_notification_log_appointment ON notification_log(appointment_id);

CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID UNIQUE NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  send_confirmation BOOLEAN DEFAULT true,
  send_reminder_24h BOOLEAN DEFAULT true,
  send_reminder_1h BOOLEAN DEFAULT true,
  send_followup BOOLEAN DEFAULT true,
  
  notify_admin_new_appointment BOOLEAN DEFAULT true,
  notify_admin_cancellation BOOLEAN DEFAULT true,
  notify_admin_daily_summary BOOLEAN DEFAULT true,
  
  followup_delay_hours INTEGER DEFAULT 24,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. Widget Configuration
-- ============================================

CREATE TABLE widget_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID UNIQUE NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  embed_code TEXT UNIQUE DEFAULT 'wgt_' || encode(gen_random_bytes(12), 'hex'),
  
  is_active BOOLEAN DEFAULT true,
  
  button_text TEXT DEFAULT 'Book Now',
  button_position TEXT DEFAULT 'bottom-right',
  
  primary_color TEXT DEFAULT '#F97316',
  button_text_color TEXT DEFAULT '#FFFFFF',
  background_color TEXT DEFAULT '#FFFFFF',
  text_color TEXT DEFAULT '#0F172A',
  border_color TEXT DEFAULT '#E2E8F0',
  
  custom_css TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE widget_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  event_type TEXT NOT NULL,
  
  page_url TEXT,
  user_agent TEXT,
  
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  
  metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_widget_analytics_business ON widget_analytics(business_id);
CREATE INDEX idx_widget_analytics_created ON widget_analytics(created_at);

-- ============================================
-- 12. Helper Functions (SECURITY DEFINER)
-- ============================================

-- Get user's business_id
CREATE OR REPLACE FUNCTION public.get_user_business_id()
RETURNS UUID AS $$
  SELECT business_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Check if user has minimum role level
CREATE OR REPLACE FUNCTION public.has_role(required_role user_role)
RETURNS BOOLEAN AS $$
DECLARE
  user_role_val user_role;
  role_hierarchy INTEGER;
  required_hierarchy INTEGER;
BEGIN
  SELECT role INTO user_role_val FROM public.users WHERE id = auth.uid();
  
  IF user_role_val IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Define hierarchy: owner=4, admin=3, dispatcher=2, technician=1
  role_hierarchy := CASE user_role_val
    WHEN 'owner' THEN 4
    WHEN 'admin' THEN 3
    WHEN 'dispatcher' THEN 2
    WHEN 'technician' THEN 1
    ELSE 0
  END;
  
  required_hierarchy := CASE required_role
    WHEN 'owner' THEN 4
    WHEN 'admin' THEN 3
    WHEN 'dispatcher' THEN 2
    WHEN 'technician' THEN 1
    ELSE 0
  END;
  
  RETURN role_hierarchy >= required_hierarchy;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- ============================================
-- 13. Triggers
-- ============================================

-- Generate appointment reference code
CREATE OR REPLACE FUNCTION public.generate_appointment_ref_code()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  seq INTEGER;
BEGIN
  SELECT UPPER(LEFT(name, 3)) INTO prefix FROM public.businesses WHERE id = NEW.business_id;
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(ref_code FROM '[0-9]+$') AS INTEGER)
  ), 0) + 1 INTO seq
  FROM public.appointments 
  WHERE business_id = NEW.business_id;
  
  NEW.ref_code := prefix || '-' || LPAD(seq::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_appointment_ref_code
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  WHEN (NEW.ref_code IS NULL)
  EXECUTE FUNCTION public.generate_appointment_ref_code();

-- Generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  year_str TEXT;
  seq INTEGER;
BEGIN
  prefix := 'INV';
  year_str := TO_CHAR(NOW(), 'YY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)
  ), 0) + 1 INTO seq
  FROM public.invoices 
  WHERE business_id = NEW.business_id
  AND invoice_number LIKE prefix || '-' || year_str || '-%';
  
  NEW.invoice_number := prefix || '-' || year_str || '-' || LPAD(seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION public.generate_invoice_number();

-- Create default operating hours for new businesses
CREATE OR REPLACE FUNCTION public.create_default_operating_hours()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.operating_hours (business_id, day_of_week, is_open, open_time, close_time)
  VALUES
    (NEW.id, 'monday', true, '08:00', '18:00'),
    (NEW.id, 'tuesday', true, '08:00', '18:00'),
    (NEW.id, 'wednesday', true, '08:00', '18:00'),
    (NEW.id, 'thursday', true, '08:00', '18:00'),
    (NEW.id, 'friday', true, '08:00', '18:00'),
    (NEW.id, 'saturday', true, '09:00', '14:00'),
    (NEW.id, 'sunday', false, NULL, NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER on_business_created_add_hours
  AFTER INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_operating_hours();

-- Auto-setup for new business
CREATE OR REPLACE FUNCTION public.on_business_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.booking_rules (business_id) VALUES (NEW.id);
  INSERT INTO public.notification_settings (business_id) VALUES (NEW.id);
  INSERT INTO public.widget_config (business_id) VALUES (NEW.id);
  
  INSERT INTO public.service_categories (business_id, name, slug, icon, sort_order)
  VALUES
    (NEW.id, 'Plumbing', 'plumbing', 'Droplets', 1),
    (NEW.id, 'Electrical', 'electrical', 'Zap', 2),
    (NEW.id, 'Roofing', 'roofing', 'Home', 3),
    (NEW.id, 'HVAC', 'hvac', 'Wind', 4),
    (NEW.id, 'Pool Cleaning', 'pool-cleaning', 'Waves', 5),
    (NEW.id, 'General Handyman', 'handyman', 'Wrench', 6);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER on_business_created_setup
  AFTER INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.on_business_created();

-- Update customer stats
CREATE OR REPLACE FUNCTION public.update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.customers SET
      total_appointments = (
        SELECT COUNT(*) FROM public.appointments WHERE customer_id = NEW.customer_id
      ),
      last_appointment_at = (
        SELECT MAX(scheduled_date::TIMESTAMP + scheduled_start_time) 
        FROM public.appointments 
        WHERE customer_id = NEW.customer_id AND status = 'completed'
      ),
      updated_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER on_appointment_change_update_customer
  AFTER INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_stats();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_service_categories_updated_at BEFORE UPDATE ON public.service_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_booking_rules_updated_at BEFORE UPDATE ON public.booking_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_service_areas_updated_at BEFORE UPDATE ON public.service_areas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON public.notification_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON public.notification_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_widget_config_updated_at BEFORE UPDATE ON public.widget_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 14. Enable RLS on All Tables
-- ============================================

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operating_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_analytics ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 15. RLS Policies
-- ============================================

-- Businesses
CREATE POLICY "Users can view their own business" ON public.businesses
  FOR SELECT USING (id = public.get_user_business_id());

CREATE POLICY "Owners can update their business" ON public.businesses
  FOR UPDATE USING (id = public.get_user_business_id() AND public.has_role('owner'));

-- Users
CREATE POLICY "Users can view team members" ON public.users
  FOR SELECT USING (business_id = public.get_user_business_id());

CREATE POLICY "Admins can insert users" ON public.users
  FOR INSERT WITH CHECK (business_id = public.get_user_business_id() AND public.has_role('admin'));

CREATE POLICY "Users can update themselves" ON public.users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can update any user" ON public.users
  FOR UPDATE USING (business_id = public.get_user_business_id() AND public.has_role('admin'));

-- Team Invitations
CREATE POLICY "Admins can view invitations" ON public.team_invitations
  FOR SELECT USING (business_id = public.get_user_business_id() AND public.has_role('admin'));

CREATE POLICY "Admins can create invitations" ON public.team_invitations
  FOR INSERT WITH CHECK (business_id = public.get_user_business_id() AND public.has_role('admin'));

CREATE POLICY "Admins can delete invitations" ON public.team_invitations
  FOR DELETE USING (business_id = public.get_user_business_id() AND public.has_role('admin'));

-- Service Categories
CREATE POLICY "Users can view categories" ON public.service_categories
  FOR SELECT USING (business_id = public.get_user_business_id());

CREATE POLICY "Admins can insert categories" ON public.service_categories
  FOR INSERT WITH CHECK (business_id = public.get_user_business_id() AND public.has_role('admin'));

CREATE POLICY "Admins can update categories" ON public.service_categories
  FOR UPDATE USING (business_id = public.get_user_business_id() AND public.has_role('admin'));

CREATE POLICY "Admins can delete categories" ON public.service_categories
  FOR DELETE USING (business_id = public.get_user_business_id() AND public.has_role('admin'));

-- Services
CREATE POLICY "Users can view services" ON public.services
  FOR SELECT USING (business_id = public.get_user_business_id());

CREATE POLICY "Admins can insert services" ON public.services
  FOR INSERT WITH CHECK (business_id = public.get_user_business_id() AND public.has_role('admin'));

CREATE POLICY "Admins can update services" ON public.services
  FOR UPDATE USING (business_id = public.get_user_business_id() AND public.has_role('admin'));

CREATE POLICY "Admins can delete services" ON public.services
  FOR DELETE USING (business_id = public.get_user_business_id() AND public.has_role('admin'));

-- Customers
CREATE POLICY "Users can view customers" ON public.customers
  FOR SELECT USING (business_id = public.get_user_business_id());

CREATE POLICY "Users can insert customers" ON public.customers
  FOR INSERT WITH CHECK (business_id = public.get_user_business_id());

CREATE POLICY "Users can update customers" ON public.customers
  FOR UPDATE USING (business_id = public.get_user_business_id());

CREATE POLICY "Admins can delete customers" ON public.customers
  FOR DELETE USING (business_id = public.get_user_business_id() AND public.has_role('admin'));

-- Customer Addresses
CREATE POLICY "Users can view customer addresses" ON public.customer_addresses
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.business_id = public.get_user_business_id()));

CREATE POLICY "Users can insert customer addresses" ON public.customer_addresses
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.business_id = public.get_user_business_id()));

CREATE POLICY "Users can update customer addresses" ON public.customer_addresses
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.business_id = public.get_user_business_id()));

CREATE POLICY "Users can delete customer addresses" ON public.customer_addresses
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.business_id = public.get_user_business_id()));

-- Appointments
CREATE POLICY "Users can view appointments" ON public.appointments
  FOR SELECT USING (business_id = public.get_user_business_id());

CREATE POLICY "Users can insert appointments" ON public.appointments
  FOR INSERT WITH CHECK (business_id = public.get_user_business_id());

CREATE POLICY "Users can update appointments" ON public.appointments
  FOR UPDATE USING (business_id = public.get_user_business_id());

CREATE POLICY "Admins can delete appointments" ON public.appointments
  FOR DELETE USING (business_id = public.get_user_business_id() AND public.has_role('admin'));

-- Customer portal access to appointments
CREATE POLICY "Portal access to appointments" ON public.appointments
  FOR SELECT USING (portal_token IS NOT NULL);

-- Appointment Activity
CREATE POLICY "Users can view appointment activity" ON public.appointment_activity
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND a.business_id = public.get_user_business_id()));

CREATE POLICY "Users can insert appointment activity" ON public.appointment_activity
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND a.business_id = public.get_user_business_id()));

-- Appointment Photos
CREATE POLICY "Users can view appointment photos" ON public.appointment_photos
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND a.business_id = public.get_user_business_id()));

CREATE POLICY "Users can insert appointment photos" ON public.appointment_photos
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND a.business_id = public.get_user_business_id()));

CREATE POLICY "Users can delete appointment photos" ON public.appointment_photos
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND a.business_id = public.get_user_business_id()));

-- Call Logs
CREATE POLICY "Users can view call logs" ON public.call_logs
  FOR SELECT USING (business_id = public.get_user_business_id());

CREATE POLICY "System can insert call logs" ON public.call_logs
  FOR INSERT WITH CHECK (true);

-- Call Messages
CREATE POLICY "Users can view call messages" ON public.call_messages
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.call_logs cl WHERE cl.id = call_log_id AND cl.business_id = public.get_user_business_id()));

CREATE POLICY "System can insert call messages" ON public.call_messages
  FOR INSERT WITH CHECK (true);

-- Operating Hours
CREATE POLICY "Users can view operating hours" ON public.operating_hours
  FOR SELECT USING (business_id = public.get_user_business_id());

CREATE POLICY "Admins can insert operating hours" ON public.operating_hours
  FOR INSERT WITH CHECK (business_id = public.get_user_business_id() AND public.has_role('admin'));

CREATE POLICY "Admins can update operating hours" ON public.operating_hours
  FOR UPDATE USING (business_id = public.get_user_business_id() AND public.has_role('admin'));

-- Booking Rules
CREATE POLICY "Users can view booking rules" ON public.booking_rules
  FOR SELECT USING (business_id = public.get_user_business_id());

CREATE POLICY "Admins can update booking rules" ON public.booking_rules
  FOR UPDATE USING (business_id = public.get_user_business_id() AND public.has_role('admin'));

-- Technician Availability
CREATE POLICY "Users can view technician availability" ON public.technician_availability
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = technician_id AND u.business_id = public.get_user_business_id()));

CREATE POLICY "Technicians can manage their availability" ON public.technician_availability
  FOR ALL USING (technician_id = auth.uid());

CREATE POLICY "Admins can manage all availability" ON public.technician_availability
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = technician_id AND u.business_id = public.get_user_business_id()) AND public.has_role('admin'));

-- Availability Overrides
CREATE POLICY "Users can view availability overrides" ON public.availability_overrides
  FOR SELECT USING (business_id = public.get_user_business_id());

CREATE POLICY "Admins can manage availability overrides" ON public.availability_overrides
  FOR ALL USING (business_id = public.get_user_business_id() AND public.has_role('admin'));

-- Service Areas
CREATE POLICY "Users can view service areas" ON public.service_areas
  FOR SELECT USING (business_id = public.get_user_business_id());

CREATE POLICY "Admins can manage service areas" ON public.service_areas
  FOR ALL USING (business_id = public.get_user_business_id() AND public.has_role('admin'));

-- Invoices
CREATE POLICY "Users can view invoices" ON public.invoices
  FOR SELECT USING (business_id = public.get_user_business_id());

CREATE POLICY "Dispatchers can insert invoices" ON public.invoices
  FOR INSERT WITH CHECK (business_id = public.get_user_business_id() AND public.has_role('dispatcher'));

CREATE POLICY "Dispatchers can update invoices" ON public.invoices
  FOR UPDATE USING (business_id = public.get_user_business_id() AND public.has_role('dispatcher'));

CREATE POLICY "Admins can delete invoices" ON public.invoices
  FOR DELETE USING (business_id = public.get_user_business_id() AND public.has_role('admin'));

-- Invoice Items
CREATE POLICY "Users can view invoice items" ON public.invoice_items
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.business_id = public.get_user_business_id()));

CREATE POLICY "Dispatchers can manage invoice items" ON public.invoice_items
  FOR ALL USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.business_id = public.get_user_business_id()) AND public.has_role('dispatcher'));

-- Notification Templates
CREATE POLICY "Users can view notification templates" ON public.notification_templates
  FOR SELECT USING (business_id = public.get_user_business_id());

CREATE POLICY "Admins can manage notification templates" ON public.notification_templates
  FOR ALL USING (business_id = public.get_user_business_id() AND public.has_role('admin'));

-- Notification Recipients
CREATE POLICY "Users can view notification recipients" ON public.notification_recipients
  FOR SELECT USING (business_id = public.get_user_business_id());

CREATE POLICY "Admins can manage notification recipients" ON public.notification_recipients
  FOR ALL USING (business_id = public.get_user_business_id() AND public.has_role('admin'));

-- Notification Log
CREATE POLICY "Users can view notification log" ON public.notification_log
  FOR SELECT USING (business_id = public.get_user_business_id());

CREATE POLICY "System can insert notification log" ON public.notification_log
  FOR INSERT WITH CHECK (true);

-- Notification Settings
CREATE POLICY "Users can view notification settings" ON public.notification_settings
  FOR SELECT USING (business_id = public.get_user_business_id());

CREATE POLICY "Admins can update notification settings" ON public.notification_settings
  FOR UPDATE USING (business_id = public.get_user_business_id() AND public.has_role('admin'));

-- Widget Config (public read for embedding)
CREATE POLICY "Public can read active widget config" ON public.widget_config
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage widget config" ON public.widget_config
  FOR ALL USING (business_id = public.get_user_business_id() AND public.has_role('admin'));

-- Widget Analytics (public insert)
CREATE POLICY "Public can insert widget analytics" ON public.widget_analytics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view widget analytics" ON public.widget_analytics
  FOR SELECT USING (business_id = public.get_user_business_id() AND public.has_role('admin'));