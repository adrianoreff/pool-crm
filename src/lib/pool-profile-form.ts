import { z } from 'zod';

export const POOL_TYPES = [
  { value: 'inground', label: 'In-ground' },
  { value: 'above_ground', label: 'Above ground' },
  { value: 'plastic', label: 'Plastic pool' },
] as const;

export const SANITIZER_TYPES = [
  { value: 'salt', label: 'Salt' },
  { value: 'chlorine', label: 'Chlorine' },
] as const;

export const RATE_TYPES = [
  { value: '', label: 'None' },
  { value: 'flat', label: 'Flat' },
  { value: 'hourly', label: 'Hourly' },
] as const;

export const poolProfileSchema = z.object({
  pool_type: z.string().optional(),
  sanitizer_type: z.string().optional(),
  has_pool: z.boolean(),
  has_spa: z.boolean(),
  has_water_feature: z.boolean(),
  service_rate: z.string().optional(),
  service_rate_type: z.string().optional(),
  labor_cost: z.string().optional(),
  labor_cost_type: z.string().optional(),
  minutes_at_stop: z.string().optional(),
  location_notes: z.string().max(500).optional(),
});

export type PoolProfileFormData = z.infer<typeof poolProfileSchema>;

export const defaultPoolProfileFormValues: PoolProfileFormData = {
  pool_type: '',
  sanitizer_type: '',
  has_pool: true,
  has_spa: false,
  has_water_feature: false,
  service_rate: '',
  service_rate_type: '',
  labor_cost: '',
  labor_cost_type: '',
  minutes_at_stop: '',
  location_notes: '',
};

export type PoolProfileRow = {
  pool_type?: string | null;
  sanitizer_type?: string | null;
  has_pool?: boolean | null;
  has_spa?: boolean | null;
  has_water_feature?: boolean | null;
  service_rate?: number | null;
  service_rate_type?: string | null;
  labor_cost?: number | null;
  labor_cost_type?: string | null;
  minutes_at_stop?: number | null;
  location_notes?: string | null;
  gallons?: number | null;
  notes?: string | null;
};

export function poolProfileToFormData(row: PoolProfileRow | null | undefined): PoolProfileFormData {
  if (!row) return { ...defaultPoolProfileFormValues };
  return {
    pool_type: row.pool_type || '',
    sanitizer_type: row.sanitizer_type || '',
    has_pool: row.has_pool ?? true,
    has_spa: row.has_spa ?? false,
    has_water_feature: row.has_water_feature ?? false,
    service_rate: row.service_rate != null ? String(row.service_rate) : '',
    service_rate_type: row.service_rate_type || '',
    labor_cost: row.labor_cost != null ? String(row.labor_cost) : '',
    labor_cost_type: row.labor_cost_type || '',
    minutes_at_stop: row.minutes_at_stop != null ? String(row.minutes_at_stop) : '',
    location_notes: row.location_notes || '',
  };
}

export function poolProfileFormToPayload(data: PoolProfileFormData) {
  const parseNum = (s: string | undefined) => {
    if (!s?.trim()) return null;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  };
  const minutes = data.minutes_at_stop?.trim()
    ? parseInt(data.minutes_at_stop, 10)
    : null;

  return {
    pool_type: data.pool_type?.trim() || null,
    sanitizer_type: data.sanitizer_type?.trim() || null,
    has_pool: data.has_pool,
    has_spa: data.has_spa,
    has_water_feature: data.has_water_feature,
    service_rate: parseNum(data.service_rate),
    service_rate_type: data.service_rate_type?.trim() || null,
    labor_cost: parseNum(data.labor_cost),
    labor_cost_type: data.labor_cost_type?.trim() || null,
    minutes_at_stop: minutes != null && !Number.isNaN(minutes) ? minutes : null,
    location_notes: data.location_notes?.trim() || null,
  };
}

export function getPoolTypeLabel(value: string | null | undefined) {
  return POOL_TYPES.find((t) => t.value === value)?.label ?? value ?? '—';
}

export function getSanitizerLabel(value: string | null | undefined) {
  return SANITIZER_TYPES.find((t) => t.value === value)?.label ?? value ?? '—';
}
