/** Default tap-picker values by reading key (Skimmer-style). Used when DB preset_values is empty. */
export const DEFAULT_READING_PRESETS: Record<string, string[]> = {
  free_chlorine: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
  total_chlorine: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
  ph: ['7.0', '7.2', '7.4', '7.6', '7.8', '8.0', '8.2', '8.4'],
  total_alkalinity: ['40', '60', '80', '100', '120', '140', '160', '180', '200'],
  cyanuric_acid: ['0', '10', '20', '30', '40', '50', '60', '70', '80', '90', '100'],
  total_bromine: ['0', '1', '2', '3', '4', '5', '6', '7', '8'],
  total_hardness: ['100', '150', '200', '250', '300', '350', '400', '450', '500'],
  salt: ['2000', '2500', '2700', '3000', '3200', '3400', '3600', '4000'],
  phosphates: ['0', '100', '200', '300', '500', '1000'],
  tds: ['500', '750', '1000', '1250', '1500', '2000', '2500', '3000'],
};

export function getReadingPresets(key: string, presetValues: unknown): string[] {
  if (Array.isArray(presetValues) && presetValues.length > 0) {
    return presetValues.map(String);
  }
  return DEFAULT_READING_PRESETS[key] ?? ['0', '1', '2', '3', '4', '5'];
}

export function getDosagePresets(presetValues: unknown): string[] {
  if (Array.isArray(presetValues) && presetValues.length > 0) {
    return presetValues.map(String);
  }
  return [];
}

export function formatLastReadingLabel(
  dateStr: string,
  value: string,
  unit?: string | null
): string {
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T12:00:00'));
  const md = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
  const unitSuffix = unit ? ` ${unit}` : '';
  return `Last ${md} ${value}${unitSuffix}`;
}
