import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CallLogWithCustomer, CallLogWithMessages, CallLogFilters } from '@/types/database';
import { useEffect } from 'react';
import { toast } from 'sonner';

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

// Hook to delete a single call log
export function useDeleteCallLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (callId: string) => {
      // First delete related call messages
      const { error: messagesError } = await supabase
        .from('call_messages')
        .delete()
        .eq('call_log_id', callId);

      if (messagesError) throw messagesError;

      // Then delete the call log
      const { error } = await supabase
        .from('call_logs')
        .delete()
        .eq('id', callId);

      if (error) throw error;
      return callId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-logs'] });
      toast.success('Call log deleted');
    },
    onError: (error) => {
      console.error('Error deleting call log:', error);
      toast.error('Failed to delete call log');
    },
  });
}

// Hook to delete all call logs for the business
export function useClearAllCallLogs() {
  const { profile } = useAuth();
  const businessId = profile?.business_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error('No business ID');

      // Get all call log IDs for this business
      const { data: callLogs, error: fetchError } = await supabase
        .from('call_logs')
        .select('id')
        .eq('business_id', businessId);

      if (fetchError) throw fetchError;

      if (callLogs && callLogs.length > 0) {
        const callIds = callLogs.map(c => c.id);

        // Delete all related call messages
        const { error: messagesError } = await supabase
          .from('call_messages')
          .delete()
          .in('call_log_id', callIds);

        if (messagesError) throw messagesError;

        // Delete all call logs
        const { error } = await supabase
          .from('call_logs')
          .delete()
          .eq('business_id', businessId);

        if (error) throw error;
      }

      return callLogs?.length || 0;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['call-logs'] });
      toast.success(`Cleared ${count} call log(s)`);
    },
    onError: (error) => {
      console.error('Error clearing call logs:', error);
      toast.error('Failed to clear call history');
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
