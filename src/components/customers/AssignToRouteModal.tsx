import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useRoutes, useAddRouteStop } from '@/hooks/useRoutes';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const DAY_LABELS: Record<string, string> = {
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
};

interface AssignToRouteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
}

export function AssignToRouteModal({
  open,
  onOpenChange,
  customerId,
  customerName,
}: AssignToRouteModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: routes = [], isLoading } = useRoutes();
  const addStop = useAddRouteStop();
  const [routeId, setRouteId] = useState('');

  const activeRoutes = routes.filter((r) => r.is_active);

  const handleAssign = async () => {
    if (!routeId) return;
    try {
      await supabase
        .from('route_stops')
        .update({ is_active: false })
        .eq('customer_id', customerId)
        .eq('is_active', true);
      await addStop.mutateAsync({
        route_id: routeId,
        customer_id: customerId,
      });
      queryClient.invalidateQueries({ queryKey: ['customer-route-stop', customerId] });
      toast({
        title: 'Added to route',
        description: `${customerName} was added to the route.`,
      });
      onOpenChange(false);
      setRouteId('');
    } catch (e) {
      toast({
        title: 'Could not assign route',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to route</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Assign <strong>{customerName}</strong> to a weekly route. Stops appear when you generate visits for that day.
        </p>
        <div className="space-y-2">
          <Label>Route</Label>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : activeRoutes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No routes yet. Create one in Route Manager first.
            </p>
          ) : (
            <Select value={routeId} onValueChange={setRouteId}>
              <SelectTrigger>
                <SelectValue placeholder="Select technician route" />
              </SelectTrigger>
              <SelectContent>
                {activeRoutes.map((route) => {
                  const tech = route.technician
                    ? `${route.technician.first_name || ''} ${route.technician.last_name || ''}`.trim()
                    : 'Unassigned';
                  const day = DAY_LABELS[route.day_of_week] || route.day_of_week;
                  return (
                    <SelectItem key={route.id} value={route.id}>
                      {route.name} — {tech} ({day})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!routeId || addStop.isPending || activeRoutes.length === 0}
          >
            {addStop.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add to route
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
