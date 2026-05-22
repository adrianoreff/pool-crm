import { useState } from 'react';
import { MapPin, Plus, Trash2, Route } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import { useCustomerRouteStop } from '@/hooks/useCustomerRoute';
import { useRemoveRouteStop } from '@/hooks/useRoutes';
import { AssignToRouteModal } from './AssignToRouteModal';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const DAY_LABELS: Record<string, string> = {
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
};

interface CustomerRouteCardProps {
  customerId: string;
  customerName: string;
}

export function CustomerRouteCard({ customerId, customerName }: CustomerRouteCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: stop, isLoading } = useCustomerRouteStop(customerId);
  const removeStop = useRemoveRouteStop();
  const [assignOpen, setAssignOpen] = useState(false);

  const handleRemove = async () => {
    if (!stop) return;
    try {
      await removeStop.mutateAsync(stop.id);
      queryClient.invalidateQueries({ queryKey: ['customer-route-stop', customerId] });
      toast({ title: 'Removed from route' });
    } catch (e) {
      toast({
        title: 'Could not remove',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const techName = stop?.route?.technician
    ? `${stop.route.technician.first_name || ''} ${stop.route.technician.last_name || ''}`.trim()
    : null;
  const dayLabel = stop?.route?.day_of_week
    ? DAY_LABELS[stop.route.day_of_week] || stop.route.day_of_week
    : null;

  return (
    <>
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Route className="h-4 w-4" />
            Weekly route
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : stop ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{stop.route.name}</Badge>
                {techName && <span className="text-sm">{techName}</span>}
                {dayLabel && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {dayLabel}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Stop #{stop.sort_order + 1} on this route. Generate visits from Route Dashboard to schedule appointments.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={handleRemove}
                disabled={removeStop.isPending}
              >
                {removeStop.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Remove from route
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Not on a weekly route. Add this pool to a technician&apos;s recurring route.
              </p>
              <Button size="sm" onClick={() => setAssignOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add to route
              </Button>
            </>
          )}
          {stop && (
            <Button variant="ghost" size="sm" onClick={() => setAssignOpen(true)}>
              Change route
            </Button>
          )}
        </CardContent>
      </Card>
      <AssignToRouteModal
        open={assignOpen}
        onOpenChange={setAssignOpen}
        customerId={customerId}
        customerName={customerName}
      />
    </>
  );
}
