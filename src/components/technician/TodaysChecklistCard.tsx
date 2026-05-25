import { ChecklistSwipeRow } from '@/components/technician/ChecklistSwipeRow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import type { ServiceChecklistItem } from '@/types/service-checklist';

interface TodaysChecklistCardProps {
  items: ServiceChecklistItem[];
  isLoading?: boolean;
  isItemCompleted: (itemId: string) => boolean;
  getStatusLabel: (item: ServiceChecklistItem) => string | undefined;
  onToggle: (item: ServiceChecklistItem, completed: boolean) => void;
  disabled?: boolean;
  requiredIncompleteCount?: number;
}

export function TodaysChecklistCard({
  items,
  isLoading,
  isItemCompleted,
  getStatusLabel,
  onToggle,
  disabled,
  requiredIncompleteCount = 0,
}: TodaysChecklistCardProps) {
  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-0 pt-4 px-4">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <CardTitle className="text-base font-semibold text-sky-700">Today&apos;s Checklist</CardTitle>
          <span className="text-xs text-sky-600/90">(Swipe right to complete or undo)</span>
        </div>
      </CardHeader>
      <CardContent className="p-0 pb-1">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground px-4 py-6">
            No checklist items. Ask your office to configure Weekly Pool Service checklist under
            Services.
          </p>
        ) : (
          <>
            {requiredIncompleteCount > 0 && (
              <p className="text-xs text-amber-600 px-4 pt-2">
                {requiredIncompleteCount} required item(s) before finishing stop.
              </p>
            )}
            <div className="divide-y divide-border/60">
              {items.map((item) => {
                const completed = isItemCompleted(item.id);
                return (
                  <ChecklistSwipeRow
                    key={item.id}
                    label={item.description}
                    statusLabel={completed ? undefined : getStatusLabel(item)}
                    completed={completed}
                    disabled={disabled}
                    onToggle={(next) => onToggle(item, next)}
                  />
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
