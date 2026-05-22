import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppointmentWithRelations } from '@/types/database';
import { addDaysToDateString, getLocalDateString } from '@/lib/utils';

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
          technician:users!appointments_technician_id_fkey(id, first_name, last_name, avatar_url, color),
          route_stop:route_stops(sort_order, est_minutes)
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
      
      const sorted = [...(data || [])].sort((a, b) => {
        if (a.scheduled_date !== b.scheduled_date) {
          return a.scheduled_date.localeCompare(b.scheduled_date);
        }
        const orderA = (a as { route_stop?: { sort_order: number } | null }).route_stop?.sort_order ?? 9999;
        const orderB = (b as { route_stop?: { sort_order: number } | null }).route_stop?.sort_order ?? 9999;
        if (orderA !== orderB) return orderA - orderB;
        return a.scheduled_start_time.localeCompare(b.scheduled_start_time);
      });
      return sorted as AppointmentWithRelations[];
    },
    enabled: !!technicianId,
  });
}

export function useTodayTechnicianAppointments() {
  const today = getLocalDateString();
  return useTechnicianAppointments({ dateFrom: today, dateTo: today });
}

/** Future stops from tomorrow through the next N days (default 3 weeks). */
export function useUpcomingTechnicianAppointments(daysAhead = 21) {
  const today = getLocalDateString();
  return useTechnicianAppointments({
    dateFrom: addDaysToDateString(today, 1),
    dateTo: addDaysToDateString(today, daysAhead),
  });
}

export function sortTechnicianRouteStops<
  T extends {
    scheduled_date: string;
    scheduled_start_time: string;
    route_stop?: { sort_order: number } | null;
  },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.scheduled_date !== b.scheduled_date) {
      return a.scheduled_date.localeCompare(b.scheduled_date);
    }
    const orderA = a.route_stop?.sort_order ?? 9999;
    const orderB = b.route_stop?.sort_order ?? 9999;
    if (orderA !== orderB) return orderA - orderB;
    return a.scheduled_start_time.localeCompare(b.scheduled_start_time);
  });
}
