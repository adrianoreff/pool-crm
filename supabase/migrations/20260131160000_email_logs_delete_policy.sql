-- Allow users to delete email logs for their business (Clear All History on /messages)
CREATE POLICY "Users can delete email logs for their business"
  ON public.email_logs FOR DELETE
  USING (business_id = get_user_business_id());
