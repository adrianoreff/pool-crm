import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Play, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    scheduled: {
      label: 'Scheduled',
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: Clock,
    },
    confirmed: {
      label: 'Confirmed',
      color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      icon: Clock,
    },
    in_progress: {
      label: 'In Progress',
      color: 'bg-orange-100 text-orange-700 border-orange-200',
      icon: Play,
    },
    completed: {
      label: 'Completed',
      color: 'bg-green-100 text-green-700 border-green-200',
      icon: CheckCircle2,
    },
    cancelled: {
      label: 'Cancelled',
      color: 'bg-red-100 text-red-700 border-red-200',
      icon: XCircle,
    },
    no_show: {
      label: 'No Show',
      color: 'bg-red-100 text-red-700 border-red-200',
      icon: AlertCircle,
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
  const Icon = config.icon;

  return (
    <Badge className={cn('text-xs flex items-center gap-1', config.color, className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
