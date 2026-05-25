import type {
  ChecklistFrequencyType,
  ChecklistIntervalUnit,
  ChecklistStartOn,
  ServiceChecklistItem,
} from '@/types/service-checklist';

export const DEFAULT_WEEKLY_POOL_CHECKLIST_DESCRIPTIONS = [
  'Empty Baskets',
  'Skim Surface',
  'Vacuum',
  'Backwash',
  'Brushed Walls',
  'Filled Tab Floater',
] as const;

export function createChecklistItem(
  partial: Partial<ServiceChecklistItem> & Pick<ServiceChecklistItem, 'description'>
): ServiceChecklistItem {
  const description = partial.description.trim();
  return {
    id: partial.id ?? crypto.randomUUID(),
    description,
    descriptionWhenComplete: (partial.descriptionWhenComplete ?? description).trim(),
    frequencyType: partial.frequencyType ?? 'every_stop',
    intervalCount: partial.intervalCount ?? 1,
    intervalUnit: partial.intervalUnit ?? 'month',
    startOn: partial.startOn ?? 'next_stop',
    requireToFinishStop: partial.requireToFinishStop ?? false,
    requirePhoto: partial.requirePhoto ?? false,
    sortOrder: partial.sortOrder ?? 0,
  };
}

export function createDefaultWeeklyPoolChecklistItems(): ServiceChecklistItem[] {
  return DEFAULT_WEEKLY_POOL_CHECKLIST_DESCRIPTIONS.map((description, index) =>
    createChecklistItem({ description, sortOrder: index })
  );
}

/** Normalize legacy items `{ id, text, category }` from JSONB. */
export function normalizeChecklistItem(raw: unknown, index: number): ServiceChecklistItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const description = String(o.description ?? o.text ?? '').trim();
  if (!description) return null;

  return createChecklistItem({
    id: typeof o.id === 'string' ? o.id : crypto.randomUUID(),
    description,
    descriptionWhenComplete: String(o.descriptionWhenComplete ?? o.text ?? description).trim(),
    frequencyType: (o.frequencyType as ChecklistFrequencyType) ?? 'every_stop',
    intervalCount: typeof o.intervalCount === 'number' ? o.intervalCount : 1,
    intervalUnit: (o.intervalUnit as ChecklistIntervalUnit) ?? 'month',
    startOn: (o.startOn as ChecklistStartOn) ?? 'next_stop',
    requireToFinishStop: Boolean(o.requireToFinishStop),
    requirePhoto: Boolean(o.requirePhoto),
    sortOrder: typeof o.sortOrder === 'number' ? o.sortOrder : index,
  });
}

export function parseChecklistItems(json: unknown): ServiceChecklistItem[] {
  if (!Array.isArray(json)) return [];
  return json
    .map((row, i) => normalizeChecklistItem(row, i))
    .filter((x): x is ServiceChecklistItem => !!x)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getItemDisplayText(item: ServiceChecklistItem, completed: boolean): string {
  return completed ? item.descriptionWhenComplete : item.description;
}

export function itemsToLegacyPayload(items: ServiceChecklistItem[]): ServiceChecklistItem[] {
  return items.map((item, index) => ({ ...item, sortOrder: index }));
}
