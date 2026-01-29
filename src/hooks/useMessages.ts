import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface EmailLogWithRelations {
  id: string;
  business_id: string;
  email_type: string;
  recipient_type: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  status: string | null;
  resend_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  failed_at: string | null;
  error_message: string | null;
  created_at: string | null;
  customer_id: string | null;
  appointment_id: string | null;
  customer?: {
    id: string;
    first_name: string;
    last_name: string | null;
    email: string | null;
    phone: string;
  } | null;
}

export function useEmailLogs() {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['email-logs', businessId],
    queryFn: async () => {
      if (!businessId) return [];

      const { data, error } = await supabase
        .from('email_logs')
        .select(`
          *,
          customer:customers(id, first_name, last_name, email, phone)
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EmailLogWithRelations[];
    },
    enabled: !!businessId,
  });
}

export function useEmailStats() {
  const { data: emails, isLoading } = useEmailLogs();

  const stats = emails ? {
    totalSent: emails.length,
    delivered: emails.filter(e => e.status === 'delivered' || e.delivered_at).length,
    opened: emails.filter(e => e.opened_at).length,
    clicked: emails.filter(e => e.clicked_at).length,
    bounced: emails.filter(e => e.status === 'bounced' || e.bounced_at).length,
    failed: emails.filter(e => e.status === 'failed' || e.failed_at).length,
    openRate: emails.length > 0 
      ? Math.round((emails.filter(e => e.opened_at).length / emails.length) * 100)
      : 0,
    deliveryRate: emails.length > 0 
      ? Math.round((emails.filter(e => e.status === 'delivered' || e.delivered_at).length / emails.length) * 100)
      : 0,
  } : {
    totalSent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    failed: 0,
    openRate: 0,
    deliveryRate: 0,
  };

  return { stats, isLoading };
}

export function useCustomerEmailHistory(customerId: string) {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['customer-email-history', customerId, businessId],
    queryFn: async () => {
      if (!businessId || !customerId) return [];

      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('business_id', businessId)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!businessId && !!customerId,
  });
}

export function useDeleteEmailLog() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useMutation({
    mutationFn: async (emailLogId: string) => {
      const { error } = await supabase
        .from('email_logs')
        .delete()
        .eq('id', emailLogId)
        .eq('business_id', businessId!);

      if (error) throw error;
      return emailLogId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-logs'] });
      toast.success('Message deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete message');
      console.error(error);
    },
  });
}

export function useClearAllEmailLogs() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('email_logs')
        .delete()
        .eq('business_id', businessId!);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-logs'] });
      toast.success('All message history cleared');
    },
    onError: (error) => {
      toast.error('Failed to clear message history');
      console.error(error);
    },
  });
}
