import type { CustomerWithAddresses } from '@/types/database';

export type CustomerStatusFilter = 'all' | 'active' | 'inactive' | 'lead';

/** Prospect: active flag on but no completed service history yet (or tagged lead). */
export function isLeadCustomer(customer: CustomerWithAddresses): boolean {
  if (customer.is_active === false) return false;

  const tags = (customer.tags ?? []).map((t) => t.toLowerCase());
  if (tags.some((t) => t === 'lead' || t.includes('lead'))) return true;

  const notes = (customer.notes ?? '').toLowerCase();
  if (/\blead\b/.test(notes) || notes.includes('import status: lead')) return true;

  return (customer.total_appointments ?? 0) === 0;
}

export type CustomerDisplayStatus = 'active' | 'inactive' | 'lead';

export function getCustomerDisplayStatus(customer: CustomerWithAddresses): CustomerDisplayStatus {
  if (customer.is_active === false) return 'inactive';
  if (isLeadCustomer(customer)) return 'lead';
  return 'active';
}

export const CUSTOMER_STATUS_LABELS: Record<CustomerDisplayStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  lead: 'Lead',
};

export function matchesCustomerStatusFilter(
  customer: CustomerWithAddresses,
  filter: CustomerStatusFilter
): boolean {
  if (filter === 'all') return true;
  if (filter === 'inactive') return customer.is_active === false;
  if (filter === 'lead') return isLeadCustomer(customer);
  return customer.is_active !== false && !isLeadCustomer(customer);
}
