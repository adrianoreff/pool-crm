import type { RouteWithStops } from '@/hooks/useRoutes';
import type { Database } from '@/integrations/supabase/types';

export type DayOfWeek = Database['public']['Enums']['day_of_week'];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
};

export const DAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export interface CustomerRouteAssignment {
  routeId: string;
  routeName: string;
  dayOfWeek: DayOfWeek;
  technicianName: string;
}

/** Active route stop per customer (at most one per business rules). */
export function buildCustomerRouteAssignmentMap(
  routes: RouteWithStops[]
): Map<string, CustomerRouteAssignment> {
  const map = new Map<string, CustomerRouteAssignment>();

  for (const route of routes) {
    if (route.is_active === false) continue;

    const techName = route.technician
      ? `${route.technician.first_name || ''} ${route.technician.last_name || ''}`.trim() || 'Technician'
      : 'Technician';

    for (const stop of route.stops || []) {
      if (!stop.is_active || !stop.customer_id) continue;
      map.set(stop.customer_id, {
        routeId: route.id,
        routeName: route.name,
        dayOfWeek: route.day_of_week,
        technicianName: techName,
      });
    }
  }

  return map;
}

export function normalizeCity(city: string | null | undefined): string {
  const t = (city || '').trim();
  return t || 'No city';
}

export function collectCustomerCities(
  customers: { city?: string | null }[]
): string[] {
  const set = new Set<string>();
  for (const c of customers) {
    set.add(normalizeCity(c.city));
  }
  return Array.from(set).sort((a, b) => {
    if (a === 'No city') return 1;
    if (b === 'No city') return -1;
    return a.localeCompare(b);
  });
}
