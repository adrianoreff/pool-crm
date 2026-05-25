export type ChecklistFrequencyType = 'every_stop' | 'interval';
export type ChecklistIntervalUnit = 'week' | 'month';
export type ChecklistStartOn = 'next_stop';

export interface ServiceChecklistItem {
  id: string;
  description: string;
  descriptionWhenComplete: string;
  frequencyType: ChecklistFrequencyType;
  intervalCount: number;
  intervalUnit: ChecklistIntervalUnit;
  startOn: ChecklistStartOn;
  requireToFinishStop: boolean;
  requirePhoto: boolean;
  sortOrder: number;
}

export interface ServiceChecklistRecord {
  id: string;
  business_id: string;
  service_id: string | null;
  name: string;
  items: ServiceChecklistItem[];
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}
