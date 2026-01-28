import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CallLogWithCustomer, CallLogWithMessages, CallLogFilters } from '@/types/database';
import { useEffect } from 'react';

// Hook to sync VAPI calls on demand
export function useSyncVapiCalls() {
  const { profile } = useAuth();
  const businessId = profile?.business_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error('No business ID');

      const { data, error } = await supabase.functions.invoke('sync-vapi-calls', {
        body: { business_id: businessId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-logs'] });
    },
  });
}

export function useCallLogs(filters?: CallLogFilters) {
  const { profile } = useAuth();
  const businessId = profile?.business_id;
  const syncMutation = useSyncVapiCalls();

  // Auto-sync on first load
  useEffect(() => {
    if (businessId && !syncMutation.isPending) {
      syncMutation.mutate();
    }
    // Only run once when businessId becomes available
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  return useQuery({
    queryKey: ['call-logs', businessId, filters],
    queryFn: async () => {
      if (!businessId) return [];

      let query = supabase
        .from('call_logs')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('business_id', businessId)
        .order('started_at', { ascending: false });

      if (filters?.dateFrom) {
        query = query.gte('started_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('started_at', filters.dateTo);
      }
      if (filters?.outcome) {
        query = query.eq('outcome', filters.outcome);
      }
      if (filters?.hasAppointment !== undefined) {
        if (filters.hasAppointment) {
          query = query.not('appointment_id', 'is', null);
        } else {
          query = query.is('appointment_id', null);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CallLogWithCustomer[];
    },
    enabled: !!businessId,
  });
}

export function useCallLog(id: string) {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['call-log', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_logs')
        .select(`
          *,
          customer:customers(*),
          call_messages(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as CallLogWithMessages;
    },
    enabled: !!businessId && !!id,
  });
}

export function useCallLogStats() {
  const { data: callLogs, isLoading } = useCallLogs();

  const stats = callLogs ? {
    totalCalls: callLogs.length,
    bookedCalls: callLogs.filter(c => c.outcome === 'booked').length,
    avgDuration: callLogs.length > 0 
      ? Math.round(callLogs.reduce((acc, c) => acc + (c.duration_seconds || 0), 0) / callLogs.length)
      : 0,
    bookingRate: callLogs.length > 0
      ? Math.round((callLogs.filter(c => c.outcome === 'booked').length / callLogs.length) * 100)
      : 0,
  } : { totalCalls: 0, bookedCalls: 0, avgDuration: 0, bookingRate: 0 };

  return { stats, isLoading };
}
