export const READING_TYPE_OPTIONS = [
  { key: 'free_chlorine', label: 'Free Chlorine' },
  { key: 'total_chlorine', label: 'Total Chlorine' },
  { key: 'ph', label: 'pH' },
  { key: 'total_alkalinity', label: 'Total Alkalinity' },
  { key: 'cyanuric_acid', label: 'Cyanuric Acid' },
  { key: 'total_bromine', label: 'Total Bromine' },
  { key: 'total_hardness', label: 'Total Hardness' },
  { key: 'salt', label: 'Salt' },
  { key: 'phosphates', label: 'Phosphates' },
  { key: 'tds', label: 'Tds' },
  { key: 'custom', label: 'Custom (other)' },
] as const;

export function slugifyKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48) || `reading_${Date.now()}`;
}
