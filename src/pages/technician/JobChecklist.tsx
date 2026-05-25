import { useParams, useNavigate } from 'react-router-dom';
import { useAppointment } from '@/hooks/useAppointments';
import { useJobChecklist } from '@/hooks/useJobChecklist';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TodaysChecklistCard } from '@/components/technician/TodaysChecklistCard';
import { formatDoneAgo } from '@/lib/format-relative-time';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { ServiceChecklistItem } from '@/types/service-checklist';

export default function JobChecklist() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: appointment, isLoading: isLoadingAppointment } = useAppointment(id || '');
  const {
    checklistItems,
    completedItems,
    progress,
    templateLoading,
    toggleItem,
    getDisplayText,
    requiredIncomplete,
    lastDoneByItem,
    showChecklist,
  } = useJobChecklist(id || '', appointment?.service_id || null, {
    serviceName: appointment?.service?.name,
    customerId: appointment?.customer_id,
  });

  if (isLoadingAppointment || !appointment) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!showChecklist && checklistItems.length === 0) {
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

  const handleToggle = async (item: ServiceChecklistItem, completed: boolean) => {
    await toggleItem.mutateAsync({
      itemId: item.id,
      itemText: getDisplayText(item, completed),
      completed,
    });
  };

  const getStatusLabel = (item: ServiceChecklistItem) => {
    const lastDone = lastDoneByItem[item.id];
    return lastDone ? formatDoneAgo(lastDone) : undefined;
  };

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Checklist</h1>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      <TodaysChecklistCard
        items={checklistItems}
        isLoading={templateLoading}
        isItemCompleted={isItemCompleted}
        getStatusLabel={getStatusLabel}
        onToggle={handleToggle}
        disabled={toggleItem.isPending}
        requiredIncompleteCount={requiredIncomplete.length}
      />
    </div>
  );
}
