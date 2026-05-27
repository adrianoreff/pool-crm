import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

export type Route = Database['public']['Tables']['routes']['Row'];
export type RouteStop = Database['public']['Tables']['route_stops']['Row'];

export type RouteWithStops = Route & {
  technician?: { id: string; first_name: string | null; last_name: string | null };
  stops?: (RouteStop & {
    customer?: {
      id: string;
      first_name: string;
      last_name: string | null;
      email: string | null;
      phone: string | null;
      city: string | null;
    };
  })[];
};

async function deactivateActiveStopsForCustomer(customerId: string) {
  const { error } = await supabase
    .from('route_stops')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('customer_id', customerId)
    .eq('is_active', true);
  if (error) throw error;
}

async function getNextSortOrder(routeId: string): Promise<number> {
  const { data: existing } = await supabase
    .from('route_stops')
    .select('sort_order')
    .eq('route_id', routeId)
    .eq('is_active', true)
    .order('sort_order', { ascending: false })
    .limit(1);
  return (existing?.[0]?.sort_order ?? -1) + 1;
}

async function upsertActiveRouteStop(input: {
  route_id: string;
  customer_id: string;
  sort_order?: number;
  address_id?: string | null;
  est_minutes?: number;
}) {
  const { data: inactive } = await supabase
    .from('route_stops')
    .select('id, sort_order')
    .eq('route_id', input.route_id)
    .eq('customer_id', input.customer_id)
    .eq('is_active', false)
    .maybeSingle();

  if (inactive) {
    const sortOrder = input.sort_order ?? (await getNextSortOrder(input.route_id));
    const { data, error } = await supabase
      .from('route_stops')
      .update({
        is_active: true,
        sort_order: sortOrder,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inactive.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const sortOrder = input.sort_order ?? (await getNextSortOrder(input.route_id));
  const { data, error } = await supabase
    .from('route_stops')
    .insert({
      route_id: input.route_id,
      customer_id: input.customer_id,
      address_id: input.address_id ?? null,
      sort_order: sortOrder,
      est_minutes: input.est_minutes ?? 30,
      is_active: true,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

function formatRouteMutationError(error: { code?: string; message?: string }): string {
  if (error.code === '23505') {
    return 'This technician already has a route on that day. Choose another day or technician.';
  }
  return error.message || 'Unknown error';
}

const DAYS: Database['public']['Enums']['day_of_week'][] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

export function dateToDayOfWeek(dateStr: string): Database['public']['Enums']['day_of_week'] {
  const d = new Date(dateStr + 'T12:00:00').getDay();
  return DAYS[d];
}

export function useRoutes() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['routes', profile?.business_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routes')
        .select(`
          *,
          technician:users!routes_technician_id_fkey(id, first_name, last_name),
          stops:route_stops(
            *,
            customer:customers(id, first_name, last_name, email, phone, city)
          )
        `)
        .eq('business_id', profile!.business_id)
        .order('day_of_week');
      if (error) throw error;
      return (data || []) as RouteWithStops[];
    },
    enabled: !!profile?.business_id,
  });
}

export function useRouteDayStats(routeId: string | undefined, date: string) {
  return useQuery({
    queryKey: ['route-day-stats', routeId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('route_day_stats')
        .select('*')
        .eq('route_id', routeId!)
        .eq('stats_date', date)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!routeId && !!date,
  });
}

export function useGenerateRouteVisits() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ routeId, date }: { routeId?: string; date: string }) => {
      if (!profile?.business_id) {
        throw new Error('Business not found. Complete onboarding first.');
      }
      if (routeId) {
        const { data, error } = await supabase.rpc('generate_route_visits', {
          p_route_id: routeId,
          p_scheduled_date: date,
        });
        if (error) throw new Error(error.message);
        return data;
      }
      const { data, error } = await supabase.rpc('generate_all_route_visits_for_date', {
        p_business_id: profile.business_id,
        p_scheduled_date: date,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['technician-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['route-day-stats'] });
    },
  });
}

export function useCreateRoute() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      technician_id: string;
      name: string;
      day_of_week: Database['public']['Enums']['day_of_week'];
    }) => {
      const { data, error } = await supabase
        .from('routes')
        .insert({
          business_id: profile!.business_id,
          technician_id: input.technician_id,
          name: input.name,
          day_of_week: input.day_of_week,
        })
        .select()
        .single();
      if (error) throw new Error(formatRouteMutationError(error));
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routes'] }),
  });
}

export function useAddRouteStop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      route_id: string;
      customer_id: string;
      address_id?: string | null;
      sort_order?: number;
      est_minutes?: number;
    }) => {
      await deactivateActiveStopsForCustomer(input.customer_id);
      return upsertActiveRouteStop(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['customer-route-stop'] });
    },
  });
}

export function useUpdateRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      name: string;
      technician_id: string;
      day_of_week: Database['public']['Enums']['day_of_week'];
    }) => {
      const { data, error } = await supabase
        .from('routes')
        .update({
          name: input.name,
          technician_id: input.technician_id,
          day_of_week: input.day_of_week,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw new Error(formatRouteMutationError(error));
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routes'] }),
  });
}

export function useDeleteRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (routeId: string) => {
      const { error: stopsError } = await supabase
        .from('route_stops')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('route_id', routeId)
        .eq('is_active', true);
      if (stopsError) throw stopsError;

      const { error } = await supabase
        .from('routes')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', routeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['technician-appointments'] });
    },
  });
}

export type BulkAddRouteStopsResult = {
  added: number;
  skippedOnRoute: number;
  failed: number;
};

export function useBulkAddRouteStops() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      route_id: string;
      customer_ids: string[];
      skipCustomerIds?: Set<string>;
    }): Promise<BulkAddRouteStopsResult> => {
      const skip = input.skipCustomerIds ?? new Set<string>();
      let sortOrder = await getNextSortOrder(input.route_id);
      let added = 0;
      let skippedOnRoute = 0;
      let failed = 0;

      for (const customerId of input.customer_ids) {
        if (skip.has(customerId)) {
          skippedOnRoute++;
          continue;
        }

        try {
          await deactivateActiveStopsForCustomer(customerId);
          await upsertActiveRouteStop({
            route_id: input.route_id,
            customer_id: customerId,
            sort_order: sortOrder,
          });
          sortOrder += 1;
          added++;
        } catch {
          failed++;
        }
      }

      return { added, skippedOnRoute, failed };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['customer-route-stop'] });
    },
  });
}

export function useMoveCustomerToRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { route_id: string; customer_id: string }) => {
      await deactivateActiveStopsForCustomer(input.customer_id);
      return upsertActiveRouteStop({
        route_id: input.route_id,
        customer_id: input.customer_id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['customer-route-stop'] });
    },
  });
}

export function useRemoveRouteStop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stopId: string) => {
      const { error } = await supabase
        .from('route_stops')
        .update({ is_active: false })
        .eq('id', stopId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['technician-appointments'] });
    },
  });
}

export function useReorderRouteStops() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stops: { id: string; sort_order: number }[]) => {
      await Promise.all(
        stops.map((s) =>
          supabase.from('route_stops').update({ sort_order: s.sort_order }).eq('id', s.id)
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['technician-appointments'] });
    },
  });
}
