import { getLocalDateString } from '@/lib/utils';
import { nextDateForWeekday } from '@/lib/route-day-stats';
import type { DayOfWeek } from '@/lib/route-assignments';

export type RouteAssignmentFormData = {
  enabled: boolean;
  technician_id: string;
  day_of_week: DayOfWeek | '';
  frequency_weeks: 1 | 2 | 3 | 4;
  start_on: string;
  stop_after: string;
};

export const defaultRouteAssignmentFormValues: RouteAssignmentFormData = {
  enabled: false,
  technician_id: '',
  day_of_week: '',
  frequency_weeks: 1,
  start_on: '',
  stop_after: '',
};

export const FREQUENCY_OPTIONS = [
  { value: 1 as const, label: 'Weekly' },
  { value: 2 as const, label: 'Every 2 weeks' },
  { value: 3 as const, label: 'Every 3 weeks' },
  { value: 4 as const, label: 'Every 4 weeks' },
];

export const ASSIGNMENT_DAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export function defaultStartOnForDay(day: DayOfWeek): string {
  return nextDateForWeekday(getLocalDateString(), day);
}

export function routeStopToAssignmentForm(stop: {
  route?: {
    technician_id?: string;
    day_of_week?: DayOfWeek;
  } | null;
  frequency_weeks?: number | null;
  start_on?: string | null;
  stop_after?: string | null;
} | null): RouteAssignmentFormData {
  if (!stop?.route) return { ...defaultRouteAssignmentFormValues };
  return {
    enabled: true,
    technician_id: stop.route.technician_id || '',
    day_of_week: (stop.route.day_of_week as DayOfWeek) || '',
    frequency_weeks: (Math.min(4, Math.max(1, stop.frequency_weeks ?? 1)) as 1 | 2 | 3 | 4),
    start_on: stop.start_on || '',
    stop_after: stop.stop_after || '',
  };
}

export function isRouteAssignmentComplete(data: RouteAssignmentFormData): boolean {
  return data.enabled && !!data.technician_id && !!data.day_of_week;
}
