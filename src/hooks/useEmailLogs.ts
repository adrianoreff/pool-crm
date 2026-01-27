import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface EmailLog {
  id: string;
  email_type: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  failed_at: string | null;
  error_message: string | null;
  created_at: string;
  appointment_id: string | null;
  customer_id: string | null;
  resend_id: string | null;
}

export function useEmailLogs(filters?: {
  customerId?: string;
  appointmentId?: string;
  limit?: number;
}) {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['email-logs', businessId, filters],
    queryFn: async () => {
      if (!businessId) return [];

      let query = supabase
        .from('email_logs')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }

      if (filters?.appointmentId) {
        query = query.eq('appointment_id', filters.appointmentId);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as EmailLog[];
    },
    enabled: !!businessId,
  });
}

export function useCustomerEmailLogs(customerId: string) {
  return useEmailLogs({ customerId, limit: 20 });
}

export function useAppointmentEmailLogs(appointmentId: string) {
  return useEmailLogs({ appointmentId, limit: 10 });
}
