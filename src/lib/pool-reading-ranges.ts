export interface ReadingRange {
  min?: number;
  max?: number;
}

export const DEFAULT_READING_RANGES: Record<string, ReadingRange> = {
  free_chlorine: { min: 1, max: 5 },
  total_chlorine: { min: 1, max: 5 },
  ph: { min: 7.2, max: 7.8 },
  total_alkalinity: { min: 80, max: 120 },
  cyanuric_acid: { min: 30, max: 50 },
  total_bromine: { min: 2, max: 4 },
  total_hardness: { min: 200, max: 400 },
  salt: { min: 2700, max: 3400 },
  phosphates: { max: 100 },
  tds: { max: 1500 },
};

export type ReadingStatus = 'ok' | 'low' | 'high' | 'unknown';

export function getReadingRange(key: string, customRanges?: ReadingRange | null): ReadingRange | null {
  if (customRanges && (customRanges.min != null || customRanges.max != null)) {
    return customRanges;
  }
  return DEFAULT_READING_RANGES[key] ?? null;
}

export function getReadingStatus(
  key: string,
  value: number | null,
  customRanges?: ReadingRange | null
): ReadingStatus {
  if (value == null || Number.isNaN(value)) return 'unknown';
  const range = getReadingRange(key, customRanges);
  if (!range) return 'unknown';
  if (range.min != null && value < range.min) return 'low';
  if (range.max != null && value > range.max) return 'high';
  return 'ok';
}

export function parseReadingNumeric(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.-]/g, ''));
  return Number.isNaN(n) ? null : n;
}

export function readingStatusClass(status: ReadingStatus): string {
  switch (status) {
    case 'ok':
      return 'text-emerald-600 font-medium';
    case 'low':
    case 'high':
      return 'text-red-600 font-medium';
    default:
      return 'text-muted-foreground';
  }
}
