import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from './StatusBadge';
import { Clock, Wrench } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { AppointmentWithRelations } from '@/types/database';
import { cn } from '@/lib/utils';

interface JobCardProps {
  appointment: AppointmentWithRelations;
  onClick?: () => void;
  className?: string;
}

function formatTimeShort(time: string) {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export function JobCard({ appointment, onClick, className }: JobCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-shadow',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-base mb-1">
              {appointment.customer?.first_name} {appointment.customer?.last_name}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Clock className="h-3 w-3" />
              {formatTimeShort(appointment.scheduled_start_time)}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wrench className="h-3 w-3" />
              {appointment.service?.name || 'Service'}
            </div>
          </div>
          <StatusBadge status={appointment.status} />
        </div>
      </CardContent>
    </Card>
  );
}
