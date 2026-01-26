import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppointmentWithRelations, AppointmentFilters, AppointmentStatus } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useAppointments(filters?: AppointmentFilters) {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['appointments', businessId, filters],
    queryFn: async () => {
      if (!businessId) return [];

      let query = supabase
        .from('appointments')
        .select(`
          *,
          customer:customers(*),
          service:services(*),
          technician:users!appointments_technician_id_fkey(id, first_name, last_name, avatar_url, color)
        `)
        .eq('business_id', businessId)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_start_time', { ascending: true });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.dateFrom) {
        query = query.gte('scheduled_date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('scheduled_date', filters.dateTo);
      }
      if (filters?.technicianId) {
        query = query.eq('technician_id', filters.technicianId);
      }
      if (filters?.serviceId) {
        query = query.eq('service_id', filters.serviceId);
      }
      if (filters?.source) {
        query = query.eq('source', filters.source);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AppointmentWithRelations[];
    },
    enabled: !!businessId,
  });
}

export function useTodayAppointments() {
  const today = new Date().toISOString().split('T')[0];
  return useAppointments({ dateFrom: today, dateTo: today });
}

export function usePendingAppointments() {
  return useAppointments({ status: 'pending_confirmation' });
}

export function useAppointment(id: string) {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['appointment', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          customer:customers(*),
          service:services(*),
          technician:users!appointments_technician_id_fkey(id, first_name, last_name, avatar_url, color)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as AppointmentWithRelations;
    },
    enabled: !!businessId && !!id,
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AppointmentStatus }) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({ title: 'Status updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update status', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled' as AppointmentStatus, 
          cancelled_at: new Date().toISOString(),
          cancelled_by: profile?.id,
          cancellation_reason: reason,
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({ title: 'Appointment cancelled' });
    },
    onError: (error) => {
      toast({ title: 'Failed to cancel appointment', description: error.message, variant: 'destructive' });
    },
  });
}
