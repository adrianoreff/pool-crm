import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type CustomerRouteStop = {
  id: string;
  route_id: string;
  customer_id: string;
  sort_order: number;
  is_active: boolean;
  route: {
    id: string;
    name: string;
    day_of_week: string;
    technician: { first_name: string | null; last_name: string | null } | null;
  };
};

export function useCustomerRouteStop(customerId: string | undefined) {
  return useQuery({
    queryKey: ['customer-route-stop', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('route_stops')
        .select(`
          id, route_id, customer_id, sort_order, is_active,
          route:routes(id, name, day_of_week, technician:users!routes_technician_id_fkey(first_name, last_name))
        `)
        .eq('customer_id', customerId!)
        .eq('is_active', true)
        .order('sort_order')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as CustomerRouteStop | null;
    },
    enabled: !!customerId,
  });
}
