import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ACTIVITY_FEED_CLEARED_KEY = 'activity_feed_cleared_at';

export interface ActivityItem {
  id: string;
  type: 'appointment_created' | 'appointment_updated' | 'appointment_completed' | 'customer_added' | 'payment_received' | 'call_received';
  title: string;
  description: string;
  timestamp: string;
}

export function getActivityFeedClearedAt(): string | null {
  try {
    return localStorage.getItem(ACTIVITY_FEED_CLEARED_KEY);
  } catch {
    return null;
  }
}

export function useClearActivityFeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      localStorage.setItem(ACTIVITY_FEED_CLEARED_KEY, new Date().toISOString());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
    },
  });
}

export function useActivityFeed(limit = 10, clearedAtOverride?: string | null) {
  const { profile } = useAuth();
  const businessId = profile?.business_id;
  const clearedAt = clearedAtOverride !== undefined ? clearedAtOverride : getActivityFeedClearedAt();

  return useQuery({
    queryKey: ['activity-feed', businessId, limit, clearedAt ?? ''],
    queryFn: async () => {
      if (!businessId) return [];

      const activities: ActivityItem[] = [];

      // Fetch recent appointment activities
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id, 
          status, 
          created_at, 
          updated_at, 
          source,
          customer:customers(first_name, last_name),
          service:services(name)
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(limit);

      appointments?.forEach(apt => {
        const customerName = `${apt.customer?.first_name || ''} ${apt.customer?.last_name || ''}`.trim();
        
        if (apt.status === 'completed') {
          activities.push({
            id: `apt-completed-${apt.id}`,
            type: 'appointment_completed',
            title: 'Appointment Completed',
            description: `${apt.service?.name || 'Service'} for ${customerName}`,
            timestamp: apt.updated_at || apt.created_at || new Date().toISOString(),
          });
        } else {
          activities.push({
            id: `apt-created-${apt.id}`,
            type: 'appointment_created',
            title: 'New Appointment',
            description: `${apt.service?.name || 'Service'} for ${customerName} via ${apt.source}`,
            timestamp: apt.created_at || new Date().toISOString(),
          });
        }
      });

      // Fetch recent customers
      const { data: customers } = await supabase
        .from('customers')
        .select('id, first_name, last_name, created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(5);

      customers?.forEach(cust => {
        activities.push({
          id: `cust-${cust.id}`,
          type: 'customer_added',
          title: 'New Customer',
          description: `${cust.first_name} ${cust.last_name || ''}`.trim(),
          timestamp: cust.created_at || new Date().toISOString(),
        });
      });

      // Fetch recent calls
      const { data: calls } = await supabase
        .from('call_logs')
        .select('id, caller_phone, outcome, started_at')
        .eq('business_id', businessId)
        .order('started_at', { ascending: false })
        .limit(5);

      calls?.forEach(call => {
        activities.push({
          id: `call-${call.id}`,
          type: 'call_received',
          title: 'AI Call Received',
          description: `${call.caller_phone} - ${call.outcome || 'processed'}`,
          timestamp: call.started_at,
        });
      });

      // Sort by timestamp and limit
      let result = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

      // Filter out activities before cleared-at (client-side)
      if (clearedAt) {
        const clearedTime = new Date(clearedAt).getTime();
        result = result.filter((a) => new Date(a.timestamp).getTime() > clearedTime);
      }
      return result;
    },
    enabled: !!businessId,
  });
}
