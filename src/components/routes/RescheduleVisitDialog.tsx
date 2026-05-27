import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRescheduleRouteVisit } from '@/hooks/useRoutes';
import type { AppointmentWithRelations } from '@/types/database';

interface RescheduleVisitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentWithRelations | null;
  customerName: string;
}

export function RescheduleVisitDialog({
  open,
  onOpenChange,
  appointment,
  customerName,
}: RescheduleVisitDialogProps) {
  const { toast } = useToast();
  const reschedule = useRescheduleRouteVisit();
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('08:30');

  useEffect(() => {
    if (appointment && open) {
      setDate(appointment.scheduled_date);
      setStartTime(appointment.scheduled_start_time?.slice(0, 5) || '08:00');
      setEndTime(appointment.scheduled_end_time?.slice(0, 5) || '08:30');
    }
  }, [appointment, open]);

  const handleSave = async () => {
    if (!appointment || !date) return;
    try {
      await reschedule.mutateAsync({
        appointmentId: appointment.id,
        scheduled_date: date,
        scheduled_start_time: startTime,
        scheduled_end_time: endTime,
      });
      toast({
        title: 'Visit rescheduled',
        description: `${customerName} moved to ${date}. Weekly route template unchanged.`,
      });
      onOpenChange(false);
    } catch (e: unknown) {
      toast({
        title: 'Could not reschedule',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule visit</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Move <strong>{customerName}</strong> for this week only. The route still runs on its
          regular weekday for other weeks.
        </p>
        <div className="space-y-3">
          <div>
            <Label>New date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label>End</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={reschedule.isPending || !date}>
            {reschedule.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
