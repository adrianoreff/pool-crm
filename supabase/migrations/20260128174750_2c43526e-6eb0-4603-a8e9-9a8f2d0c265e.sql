-- Add RLS policies for deleting call logs
-- Admins can delete individual call logs
CREATE POLICY "Admins can delete call logs"
ON public.call_logs
FOR DELETE
USING (
  (business_id = get_user_business_id()) 
  AND has_role('admin'::user_role)
);

-- Add policy for deleting call messages when call log is deleted
CREATE POLICY "Admins can delete call messages"
ON public.call_messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM call_logs cl
    WHERE cl.id = call_messages.call_log_id
    AND cl.business_id = get_user_business_id()
  )
  AND has_role('admin'::user_role)
);