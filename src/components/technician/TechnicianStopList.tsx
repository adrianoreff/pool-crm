import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn, formatAppointmentDateShort } from '@/lib/utils';
import type { AppointmentWithRelations } from '@/types/database';

function formatTimeShort(time: string) {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function getStatusBadge(status: string) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    confirmed: { label: 'Confirmed', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    in_progress: { label: 'In Progress', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-700 border-green-200' },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-200' },
    no_show: { label: 'No Show', color: 'bg-red-100 text-red-700 border-red-200' },
  };
  return statusConfig[status] ?? statusConfig.scheduled;
}

interface TechnicianStopListProps {
  stops: AppointmentWithRelations[];
  showDate?: boolean;
  emptyMessage?: string;
}

export function TechnicianStopList({
  stops,
  showDate = false,
  emptyMessage = 'No stops scheduled',
}: TechnicianStopListProps) {
  const navigate = useNavigate();

  if (stops.length === 0) {
    return <p className="text-center text-muted-foreground py-8">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {stops.map((apt, index) => {
        const statusBadge = getStatusBadge(apt.status);
        const completedLabel =
          apt.status === 'completed' && apt.completed_at
            ? `Completed at ${new Date(apt.completed_at).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}${apt.time_spent_minutes != null ? ` · ${apt.time_spent_minutes} min` : ''}`
            : null;

        return (
          <div
            key={apt.id}
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => navigate(`/technician/jobs/${apt.id}`)}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {index + 1}
            </div>
            <div className="flex-shrink-0">
              {apt.status === 'completed' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : apt.status === 'in_progress' ? (
                <Circle className="h-5 w-5 text-orange-600 fill-orange-600" />
              ) : (
                <Circle className="h-5 w-5 text-blue-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium">
                {apt.customer?.first_name} {apt.customer?.last_name}
              </div>
              <div className="text-sm text-muted-foreground truncate">{apt.address}</div>
              {showDate && (
                <div className="text-xs font-medium text-primary mt-0.5">
                  {formatAppointmentDateShort(apt.scheduled_date)}
                </div>
              )}
              {completedLabel ? (
                <div className="text-xs text-green-700 mt-0.5">{completedLabel}</div>
              ) : (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {formatTimeShort(apt.scheduled_start_time)}
                </div>
              )}
            </div>
            <Badge className={cn('text-xs shrink-0', statusBadge.color)}>{statusBadge.label}</Badge>
          </div>
        );
      })}
    </div>
  );
}
