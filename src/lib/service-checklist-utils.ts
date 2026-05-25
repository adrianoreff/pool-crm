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

/** Stable IDs — must match seed migration `20260524120000`. */
export const WEEKLY_POOL_CHECKLIST_SEED: readonly {
  id: string;
  description: string;
  descriptionWhenComplete: string;
}[] = [
  { id: 'empty-baskets', description: 'Empty Baskets', descriptionWhenComplete: 'Emptied Baskets' },
  { id: 'skim-surface', description: 'Skim Surface', descriptionWhenComplete: 'Skimmed Surface' },
  { id: 'vacuum', description: 'Vacuum', descriptionWhenComplete: 'Vacuumed' },
  { id: 'backwash', description: 'Backwash', descriptionWhenComplete: 'Backwashed' },
  { id: 'brushed-walls', description: 'Brushed Walls', descriptionWhenComplete: 'Brushed Walls' },
  { id: 'filled-tab-floater', description: 'Filled Tab Floater', descriptionWhenComplete: 'Filled Tab Floater' },
];

export const WEEKLY_POOL_SERVICE_NAME = 'Weekly Pool Service';

export function isWeeklyPoolServiceName(name: string | null | undefined): boolean {
  return name?.trim().toLowerCase() === WEEKLY_POOL_SERVICE_NAME.toLowerCase();
}

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
  return WEEKLY_POOL_CHECKLIST_SEED.map((row, index) =>
    createChecklistItem({
      id: row.id,
      description: row.description,
      descriptionWhenComplete: row.descriptionWhenComplete,
      sortOrder: index,
    })
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
