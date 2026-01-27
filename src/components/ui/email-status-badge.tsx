import { Badge } from '@/components/ui/badge';
import { Mail, MailCheck, MailOpen, MousePointerClick, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

type EmailStatus = 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';

interface EmailStatusBadgeProps {
  status: EmailStatus;
  className?: string;
}

const statusConfig: Record<EmailStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Mail; className: string }> = {
  queued: { 
    label: 'Queued', 
    variant: 'secondary', 
    icon: Clock,
    className: 'bg-muted text-muted-foreground'
  },
  sent: { 
    label: 'Sent', 
    variant: 'default', 
    icon: Mail,
    className: 'bg-info/10 text-info border-info/20'
  },
  delivered: { 
    label: 'Delivered', 
    variant: 'default', 
    icon: MailCheck,
    className: 'bg-success/10 text-success border-success/20'
  },
  opened: { 
    label: 'Opened', 
    variant: 'default', 
    icon: MailOpen,
    className: 'bg-success/10 text-success border-success/20'
  },
  clicked: { 
    label: 'Clicked', 
    variant: 'default', 
    icon: MousePointerClick,
    className: 'bg-primary/10 text-primary border-primary/20'
  },
  bounced: { 
    label: 'Bounced', 
    variant: 'outline', 
    icon: AlertCircle,
    className: 'bg-warning/10 text-warning border-warning/20'
  },
  failed: { 
    label: 'Failed', 
    variant: 'destructive', 
    icon: AlertCircle,
    className: 'bg-destructive/10 text-destructive border-destructive/20'
  },
};

export function EmailStatusBadge({ status, className }: EmailStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.queued;
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn('gap-1 font-medium', config.className, className)}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
