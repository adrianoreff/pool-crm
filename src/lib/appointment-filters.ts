import type { AppointmentWithRelations } from '@/types/database';
import { getCustomerDisplayStatus } from '@/lib/customer-status';

export type AppointmentCategoryTab = 'all' | 'recurring' | 'leads';

const LEAD_SOURCES = new Set(['ai_call', 'phone', 'widget']);

export function isRecurringAppointment(apt: AppointmentWithRelations): boolean {
  return apt.route_stop_id != null || apt.source === 'route';
}

export function isLeadFirstVisitAppointment(apt: AppointmentWithRelations): boolean {
  const customer = apt.customer;
  if (!customer) return false;

  if (getCustomerDisplayStatus(customer) === 'lead') return true;

  if (
    apt.source &&
    LEAD_SOURCES.has(apt.source) &&
    (customer.total_appointments ?? 0) === 0
  ) {
    return true;
  }

  return false;
}

export function matchesAppointmentCategoryTab(
  apt: AppointmentWithRelations,
  tab: AppointmentCategoryTab
): boolean {
  if (tab === 'all') return true;
  if (tab === 'recurring') return isRecurringAppointment(apt);
  return isLeadFirstVisitAppointment(apt);
}
