import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export function useEnsureRouteVisitsForDate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (date: string) => {
      const { data, error } = await supabase.rpc('ensure_route_visits_for_date', {
        p_scheduled_date: date,
      });
      if (error) throw new Error(error.message);
      return data as number;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['route-day-stats'] });
      queryClient.invalidateQueries({ queryKey: ['technician-appointments'] });
    },
  });
}

export function useEnsureRouteVisitsWindow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      routeId,
      weeksAhead = 12,
    }: {
      routeId: string;
      weeksAhead?: number;
    }) => {
      const { data, error } = await supabase.rpc('ensure_route_visits_window', {
        p_route_id: routeId,
        p_weeks_ahead: weeksAhead,
      });
      if (error) throw new Error(error.message);
      return data as number;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['technician-appointments'] });
    },
  });
}

export function useEnsureAllRoutesVisitsWindow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (weeksAhead = 12) => {
      const { data, error } = await supabase.rpc('ensure_all_routes_visits_window', {
        p_weeks_ahead: weeksAhead,
      });
      if (error) throw new Error(error.message);
      return data as number;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['technician-appointments'] });
    },
  });
}
