import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, User, Clock, Wrench, MapPin } from 'lucide-react';
import type { AppointmentWithRelations } from '@/types/database';

interface TechnicianConflictModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The other appointment that conflicts (same technician, overlapping time) */
  conflictAppointment: (AppointmentWithRelations & { conflictTimeLabel?: string }) | null;
  technicianName: string;
  onSelectDifferentTechnician: () => void;
  onSelectDifferentTime: () => void;
  onAssignAnyway: () => void;
}

export function TechnicianConflictModal({
  open,
  onOpenChange,
  conflictAppointment,
  technicianName,
  onSelectDifferentTechnician,
  onSelectDifferentTime,
  onAssignAnyway,
}: TechnicianConflictModalProps) {
  if (!conflictAppointment) return null;

  const customerName = conflictAppointment.customer
    ? `${conflictAppointment.customer.first_name} ${conflictAppointment.customer.last_name || ''}`.trim()
    : 'Unknown';
  const serviceName = conflictAppointment.service?.name || 'Service';
  const timeLabel = conflictAppointment.conflictTimeLabel || `${conflictAppointment.scheduled_date} at ${conflictAppointment.scheduled_start_time}`;

  const handleSelectTechnician = () => {
    onOpenChange(false);
    onSelectDifferentTechnician();
  };

  const handleSelectTime = () => {
    onOpenChange(false);
    onSelectDifferentTime();
  };

  const handleAssignAnyway = () => {
    onOpenChange(false);
    onAssignAnyway();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" aria-describedby="conflict-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Scheduling Conflict
          </DialogTitle>
          <DialogDescription id="conflict-description">
            {technicianName} already has an appointment at this time.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-amber-600" />
            {timeLabel}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            {customerName}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            {serviceName}
          </div>
          {conflictAppointment.address && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{conflictAppointment.address}</span>
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground">Choose an option:</p>

        <div className="grid gap-2">
          <Button variant="outline" className="justify-start" onClick={handleSelectTechnician}>
            <User className="h-4 w-4 mr-2" />
            Select Different Technician
          </Button>
          <Button variant="outline" className="justify-start" onClick={handleSelectTime}>
            <Clock className="h-4 w-4 mr-2" />
            Select Different Time
          </Button>
          <Button
            variant="secondary"
            className="justify-start border-amber-200 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/30"
            onClick={handleAssignAnyway}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Assign Anyway (Double Book)
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
