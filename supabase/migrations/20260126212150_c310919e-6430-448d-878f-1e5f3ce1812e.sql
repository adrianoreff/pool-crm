-- ============================================
-- Fix overly permissive RLS policies
-- These policies used WITH CHECK (true) which is flagged as a security risk
-- We'll make them more restrictive while still allowing necessary operations
-- ============================================

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "System can insert call logs" ON public.call_logs;
DROP POLICY IF EXISTS "System can insert call messages" ON public.call_messages;
DROP POLICY IF EXISTS "System can insert notification log" ON public.notification_log;
DROP POLICY IF EXISTS "Public can insert widget analytics" ON public.widget_analytics;

-- Recreate with proper restrictions

-- Call Logs: Only authenticated users from the same business OR service role can insert
-- This is typically called from edge functions with service role
CREATE POLICY "Authenticated users can insert call logs for their business" ON public.call_logs
  FOR INSERT WITH CHECK (
    business_id = public.get_user_business_id() 
    OR auth.role() = 'service_role'
  );

-- Call Messages: Only if the call log belongs to user's business OR service role
CREATE POLICY "Authenticated users can insert call messages" ON public.call_messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.call_logs cl WHERE cl.id = call_log_id AND cl.business_id = public.get_user_business_id())
    OR auth.role() = 'service_role'
  );

-- Notification Log: Only authenticated users from the same business OR service role
CREATE POLICY "Authenticated users can insert notification logs" ON public.notification_log
  FOR INSERT WITH CHECK (
    business_id = public.get_user_business_id()
    OR auth.role() = 'service_role'
  );

-- Widget Analytics: Must have a valid business_id (validates widget exists)
-- This allows public inserts but only with a valid business reference
CREATE POLICY "Widget analytics insert with valid business" ON public.widget_analytics
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.widget_config wc WHERE wc.business_id = business_id AND wc.is_active = true)
  );