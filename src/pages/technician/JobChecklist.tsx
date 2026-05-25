import { useParams, useNavigate } from 'react-router-dom';
import { useAppointment } from '@/hooks/useAppointments';
import { useJobChecklist } from '@/hooks/useJobChecklist';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ChecklistSwipeItem } from '@/components/technician/ChecklistSwipeItem';
import { Wrench, ArrowLeft, Loader2, Camera } from 'lucide-react';
import { useState } from 'react';
import type { ServiceChecklistItem } from '@/types/service-checklist';

export default function JobChecklist() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: appointment, isLoading: isLoadingAppointment } = useAppointment(id || '');
  const {
    checklistTemplate,
    completedItems,
    progress,
    toggleItem,
    getDisplayText,
    requiredIncomplete,
  } = useJobChecklist(id || '', appointment?.service_id || null);
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});

  if (isLoadingAppointment || !appointment) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!checklistTemplate || checklistTemplate.items.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Checklist</h1>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No checklist available for this service</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isItemCompleted = (itemId: string) =>
    completedItems.find((ci) => ci.item_id === itemId)?.completed ?? false;

  const getItemNotes = (itemId: string) =>
    completedItems.find((ci) => ci.item_id === itemId)?.notes || '';

  const handleToggle = async (item: ServiceChecklistItem, completed: boolean) => {
    if (item.requirePhoto && completed) {
      // Photo capture can be wired to appointment_photos in a follow-up
    }
    const itemText = getDisplayText(item, completed);
    await toggleItem.mutateAsync({
      itemId: item.id,
      itemText,
      completed,
      notes: itemNotes[item.id],
    });
  };

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Checklist</h1>
          <div className="flex items-center gap-2 mt-1">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{checklistTemplate.name}</span>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="text-xs text-muted-foreground mt-1">
            {completedItems.filter((ci) => ci.completed).length} of{' '}
            {checklistTemplate.items.length} completed
          </div>
          {requiredIncomplete.length > 0 && (
            <p className="text-xs text-amber-600 mt-2">
              {requiredIncomplete.length} required item(s) must be completed before finishing the
              stop.
            </p>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground px-1">Swipe right on each task to mark complete.</p>

      <div className="space-y-3">
        {checklistTemplate.items.map((item) => {
          const completed = isItemCompleted(item.id);
          const notes = getItemNotes(item.id);

          return (
            <div key={item.id} className="space-y-2">
              <ChecklistSwipeItem
                label={item.description}
                completedLabel={item.descriptionWhenComplete}
                completed={completed}
                disabled={toggleItem.isPending}
                onToggle={(next) => handleToggle(item, next)}
              />
              {item.requirePhoto && (
                <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
                  <Camera className="h-3.5 w-3.5" />
                  Photo required to complete
                </div>
              )}
              {completed && (
                <Textarea
                  placeholder="Add notes about this item..."
                  value={itemNotes[item.id] ?? notes}
                  onChange={(e) => setItemNotes({ ...itemNotes, [item.id]: e.target.value })}
                  onBlur={() => {
                    const draft = itemNotes[item.id];
                    if (draft !== undefined && draft !== notes) {
                      toggleItem.mutate({
                        itemId: item.id,
                        itemText: getDisplayText(item, true),
                        completed: true,
                        notes: draft,
                      });
                    }
                  }}
                  className="text-sm"
                  rows={2}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
