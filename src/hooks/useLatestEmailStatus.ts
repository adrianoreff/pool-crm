import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LatestEmailStatus {
  id: string;
  status: string;
  email_type: string;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  delivered_at: string | null;
}

// Get latest email status for multiple customers
export function useCustomersLatestEmailStatus(customerIds: string[]) {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['latest-email-status', 'customers', customerIds, businessId],
    queryFn: async () => {
      if (!businessId || customerIds.length === 0) return {};

      const { data, error } = await supabase
        .from('email_logs')
        .select('id, customer_id, status, email_type, sent_at, opened_at, clicked_at, delivered_at, created_at')
        .eq('business_id', businessId)
        .in('customer_id', customerIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by customer and get the latest one
      const latestByCustomer: Record<string, LatestEmailStatus> = {};
      for (const log of data || []) {
        if (log.customer_id && !latestByCustomer[log.customer_id]) {
          latestByCustomer[log.customer_id] = {
            id: log.id,
            status: log.status || 'queued',
            email_type: log.email_type,
            sent_at: log.sent_at,
            opened_at: log.opened_at,
            clicked_at: log.clicked_at,
            delivered_at: log.delivered_at,
          };
        }
      }

      return latestByCustomer;
    },
    enabled: !!businessId && customerIds.length > 0,
  });
}

// Get latest email status for multiple appointments
export function useAppointmentsLatestEmailStatus(appointmentIds: string[]) {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['latest-email-status', 'appointments', appointmentIds, businessId],
    queryFn: async () => {
      if (!businessId || appointmentIds.length === 0) return {};

      const { data, error } = await supabase
        .from('email_logs')
        .select('id, appointment_id, status, email_type, sent_at, opened_at, clicked_at, delivered_at, created_at')
        .eq('business_id', businessId)
        .in('appointment_id', appointmentIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by appointment and get the latest one
      const latestByAppointment: Record<string, LatestEmailStatus> = {};
      for (const log of data || []) {
        if (log.appointment_id && !latestByAppointment[log.appointment_id]) {
          latestByAppointment[log.appointment_id] = {
            id: log.id,
            status: log.status || 'queued',
            email_type: log.email_type,
            sent_at: log.sent_at,
            opened_at: log.opened_at,
            clicked_at: log.clicked_at,
            delivered_at: log.delivered_at,
          };
        }
      }

      return latestByAppointment;
    },
    enabled: !!businessId && appointmentIds.length > 0,
  });
}
