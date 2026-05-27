import type { RouteWithStops } from '@/hooks/useRoutes';
import { dateToDayOfWeek } from '@/hooks/useRoutes';
import type { AppointmentWithRelations } from '@/types/database';
import { DAY_LABELS, type DayOfWeek } from '@/lib/route-assignments';
import { addDaysToDateString } from '@/lib/utils';

export type StopDayStatus = 'not_scheduled' | 'scheduled' | 'completed' | 'cancelled' | 'in_progress' | 'other';

export interface StopDayRow {
  stopId: string;
  customerId: string;
  customerName: string;
  city: string | null;
  sortOrder: number;
  status: StopDayStatus;
  appointmentId: string | null;
  appointment: AppointmentWithRelations | null;
}

export interface RouteDayStats {
  route: RouteWithStops;
  techName: string;
  planned: number;
  scheduled: number;
  completed: number;
  skipped: number;
  remaining: number;
  progress: number;
  stops: StopDayRow[];
}

function appointmentForStop(
  appointments: AppointmentWithRelations[],
  stopId: string,
  date: string
): AppointmentWithRelations | null {
  return (
    appointments.find(
      (a) => a.route_stop_id === stopId && a.scheduled_date === date
    ) ?? null
  );
}

function statusFromAppointment(apt: AppointmentWithRelations | null): StopDayStatus {
  if (!apt) return 'not_scheduled';
  switch (apt.status) {
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    case 'in_progress':
      return 'in_progress';
    case 'scheduled':
    case 'pending_confirmation':
    case 'confirmed':
      return 'scheduled';
    default:
      return 'other';
  }
}

export function computeRouteDayStats(
  route: RouteWithStops,
  appointments: AppointmentWithRelations[],
  date: string,
  techName: string
): RouteDayStats {
  const activeStops = (route.stops || [])
    .filter((s) => s.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  const stopIds = new Set(activeStops.map((s) => s.id));

  const routeAppointments = appointments.filter(
    (a) =>
      a.scheduled_date === date &&
      a.route_stop_id != null &&
      stopIds.has(a.route_stop_id)
  );

  const completed = routeAppointments.filter((a) => a.status === 'completed').length;
  const skipped = routeAppointments.filter((a) => a.status === 'no_show').length;
  const scheduled = routeAppointments.filter((a) => a.status !== 'cancelled').length;
  const planned = activeStops.length;
  const remaining = Math.max(0, planned - completed);

  const stops: StopDayRow[] = activeStops.map((stop) => {
    const apt = appointmentForStop(appointments, stop.id, date);
    const name = `${stop.customer?.first_name || ''} ${stop.customer?.last_name || ''}`.trim();
    return {
      stopId: stop.id,
      customerId: stop.customer_id,
      customerName: name || 'Customer',
      city: stop.customer?.city ?? null,
      sortOrder: stop.sort_order,
      status: statusFromAppointment(apt),
      appointmentId: apt?.id ?? null,
      appointment: apt,
    };
  });

  return {
    route,
    techName,
    planned,
    scheduled,
    completed,
    skipped,
    remaining,
    progress: planned ? (completed / planned) * 100 : 0,
    stops,
  };
}

/** Next calendar date on or after `fromDate` that matches `weekday` (YYYY-MM-DD). */
export function nextDateForWeekday(fromDate: string, weekday: DayOfWeek): string {
  let cursor = fromDate;
  for (let i = 0; i < 7; i++) {
    if (dateToDayOfWeek(cursor) === weekday) return cursor;
    cursor = addDaysToDateString(cursor, 1);
  }
  return fromDate;
}

/** Upcoming dates for each route's weekday (from selected date forward). */
export function suggestDatesForRoutes(
  routes: RouteWithStops[],
  fromDate: string
): { route: RouteWithStops; suggestedDate: string }[] {
  return routes.map((route) => ({
    route,
    suggestedDate: nextDateForWeekday(fromDate, route.day_of_week),
  }));
}

export function formatRouteDayBanner(dayOfWeek: DayOfWeek, date: string): string {
  const d = new Date(date + 'T12:00:00');
  const formatted = d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `Showing ${DAY_LABELS[dayOfWeek]} routes · ${formatted}`;
}

export const STOP_STATUS_LABELS: Record<StopDayStatus, string> = {
  not_scheduled: 'Not scheduled',
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  in_progress: 'In progress',
  other: 'Other',
};
