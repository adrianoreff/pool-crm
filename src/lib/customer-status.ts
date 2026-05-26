import type { CustomerWithAddresses } from '@/types/database';

export type CustomerStatusFilter = 'all' | 'active' | 'inactive' | 'lead';
export type CustomerDisplayStatus = 'active' | 'inactive' | 'lead';

/** Prospect: active flag on but no completed service history yet (or tagged lead). */
export function isLeadCustomer(customer: CustomerWithAddresses): boolean {
  if (getCustomerDisplayStatus(customer) === 'lead') return true;
  if (customer.is_active === false) return false;

  const tags = (customer.tags ?? []).map((t) => t.toLowerCase());
  if (tags.some((t) => t === 'lead' || t.includes('lead'))) return true;

  const notes = (customer.notes ?? '').toLowerCase();
  if (/\blead\b/.test(notes) || notes.includes('import status: lead')) return true;

  return (customer.total_appointments ?? 0) === 0;
}

export function getCustomerDisplayStatus(customer: CustomerWithAddresses): CustomerDisplayStatus {
  const explicit = (customer as CustomerWithAddresses & { customer_status?: string | null })
    .customer_status;
  if (explicit === 'active' || explicit === 'inactive' || explicit === 'lead') {
    return explicit;
  }
  if (customer.is_active === false) return 'inactive';
  if (isLeadCustomerLegacy(customer)) return 'lead';
  return 'active';
}

function isLeadCustomerLegacy(customer: CustomerWithAddresses): boolean {
  if (customer.is_active === false) return false;
  const tags = (customer.tags ?? []).map((t) => t.toLowerCase());
  if (tags.some((t) => t === 'lead' || t.includes('lead'))) return true;
  const notes = (customer.notes ?? '').toLowerCase();
  if (/\blead\b/.test(notes) || notes.includes('import status: lead')) return true;
  return (customer.total_appointments ?? 0) === 0;
}

export const CUSTOMER_STATUS_LABELS: Record<CustomerDisplayStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  lead: 'Lead',
};

export const CUSTOMER_STATUS_COLORS: Record<CustomerDisplayStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-700 border-slate-200',
  lead: 'bg-amber-100 text-amber-800 border-amber-200',
};

export function applyCustomerStatus(status: CustomerDisplayStatus): {
  customer_status: CustomerDisplayStatus;
  is_active: boolean;
} {
  switch (status) {
    case 'inactive':
      return { customer_status: 'inactive', is_active: false };
    case 'lead':
      return { customer_status: 'lead', is_active: true };
    default:
      return { customer_status: 'active', is_active: true };
  }
}

export function matchesCustomerStatusFilter(
  customer: CustomerWithAddresses,
  filter: CustomerStatusFilter
): boolean {
  if (filter === 'all') return true;
  return getCustomerDisplayStatus(customer) === filter;
}
