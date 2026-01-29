import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppointmentWithRelations } from '@/types/database';
import { getLocalDateString } from '@/lib/utils';

interface TechnicianAppointmentFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}

export function useTechnicianAppointments(filters?: TechnicianAppointmentFilters) {
  const { profile } = useAuth();
  const technicianId = profile?.id;

  return useQuery({
    queryKey: ['technician-appointments', technicianId, filters],
    queryFn: async () => {
      if (!technicianId) return [];

      let query = supabase
        .from('appointments')
        .select(`
          *,
          customer:customers(*),
          service:services(*),
          technician:users!appointments_technician_id_fkey(id, first_name, last_name, avatar_url, color)
        `)
        .eq('technician_id', technicianId)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_start_time', { ascending: true });

      if (filters?.status) {
        query = query.eq('status', filters.status as any);
      }
      if (filters?.dateFrom) {
        query = query.gte('scheduled_date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('scheduled_date', filters.dateTo);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching technician appointments:', error);
        throw error;
      }
      
      console.log('Technician appointments fetched:', {
        technicianId,
        count: data?.length || 0,
        appointments: data?.map(a => ({ id: a.id, date: a.scheduled_date, status: a.status }))
      });
      
      return data as AppointmentWithRelations[];
    },
    enabled: !!technicianId,
  });
}

export function useTodayTechnicianAppointments() {
  const today = getLocalDateString();
  // Include today and future appointments
  return useTechnicianAppointments({ dateFrom: today });
}
