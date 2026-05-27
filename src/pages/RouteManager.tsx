import { useMemo, useState } from 'react';
import { useRoutes, useCreateRoute, useRemoveRouteStop, useDeleteRoute } from '@/hooks/useRoutes';
import { useTeam } from '@/hooks/useTeam';
import { useCustomers } from '@/hooks/useCustomers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, MapPin, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { DAYS } from '@/lib/route-assignments';
import { RouteAddCustomersDialog } from '@/components/routes/RouteAddCustomersDialog';
import { EditRouteDialog } from '@/components/routes/EditRouteDialog';
import type { RouteWithStops } from '@/hooks/useRoutes';

interface RouteManagerProps {
  /** When true, hide page title (used inside /routes Setup tab). */
  embedded?: boolean;
}

export default function RouteManager({ embedded = false }: RouteManagerProps) {
  const { data: routes = [], isLoading } = useRoutes();
  const { data: team = [] } = useTeam();
  const { data: customers = [] } = useCustomers();
  const createRoute = useCreateRoute();
  const removeStop = useRemoveRouteStop();
  const deleteRoute = useDeleteRoute();
  const { toast } = useToast();

  const activeRoutes = useMemo(
    () => routes.filter((r) => r.is_active !== false),
    [routes]
  );

  const technicians = team.filter((t) => t.role === 'technician' && t.is_active);

  const [newRouteOpen, setNewRouteOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTech, setNewTech] = useState('');
  const [newDay, setNewDay] = useState<Database['public']['Enums']['day_of_week']>('wednesday');

  const [addCustomersRoute, setAddCustomersRoute] = useState<RouteWithStops | null>(null);
  const [editRoute, setEditRoute] = useState<RouteWithStops | null>(null);
  const [deleteRouteTarget, setDeleteRouteTarget] = useState<RouteWithStops | null>(null);

  const handleCreateRoute = async () => {
    if (!newTech || !newName) return;
    try {
      await createRoute.mutateAsync({
        technician_id: newTech,
        name: newName,
        day_of_week: newDay,
      });
      toast({ title: 'Route created' });
      setNewRouteOpen(false);
      setNewName('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error';
      toast({
        title: msg.includes('already has a route') ? 'Route conflict' : 'Error',
        description: msg,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRoute = async () => {
    if (!deleteRouteTarget) return;
    try {
      await deleteRoute.mutateAsync(deleteRouteTarget.id);
      toast({ title: 'Route deleted' });
      setDeleteRouteTarget(null);
    } catch (e: unknown) {
      toast({
        title: 'Could not delete route',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        {!embedded ? (
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MapPin className="h-7 w-7 text-primary" />
              Route Manager
            </h1>
            <p className="text-muted-foreground">Assign customers to technician routes by weekday</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Assign customers to weekly routes. Visits are scheduled automatically for the next 12
            weeks.
          </p>
        )}
        <Dialog open={newRouteOpen} onOpenChange={setNewRouteOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> New route
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create route</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Route name</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Wednesday North"
                />
              </div>
              <div>
                <Label>Technician</Label>
                <Select value={newTech} onValueChange={setNewTech}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tech" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.first_name} {t.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Day of week</Label>
                <Select value={newDay} onValueChange={(v) => setNewDay(v as typeof newDay)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => (
                      <SelectItem key={d} value={d} className="capitalize">
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleCreateRoute}>
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : activeRoutes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No active routes. Create a route to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {activeRoutes.map((route) => (
            <Card key={route.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="capitalize text-lg">
                    {route.name} — {route.day_of_week}
                    {route.technician && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        ({route.technician.first_name} {route.technician.last_name})
                      </span>
                    )}
                  </CardTitle>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Edit route"
                      onClick={() => setEditRoute(route)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete route"
                      onClick={() => setDeleteRouteTarget(route)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {(route.stops || [])
                  .filter((s) => s.is_active)
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((stop, idx) => (
                    <div
                      key={stop.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <span>
                        {idx + 1}. {stop.customer?.first_name} {stop.customer?.last_name}
                        {stop.customer?.city && (
                          <span className="text-muted-foreground text-sm"> · {stop.customer.city}</span>
                        )}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeStop.mutate(stop.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddCustomersRoute(route)}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add customers
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {addCustomersRoute && (
        <RouteAddCustomersDialog
          open={!!addCustomersRoute}
          onOpenChange={(o) => !o && setAddCustomersRoute(null)}
          route={addCustomersRoute}
          customers={customers}
          routes={routes}
        />
      )}

      <EditRouteDialog
        open={!!editRoute}
        onOpenChange={(o) => !o && setEditRoute(null)}
        route={editRoute}
        technicians={technicians}
      />

      <AlertDialog
        open={!!deleteRouteTarget}
        onOpenChange={(o) => !o && setDeleteRouteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete route?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRouteTarget && (
                <>
                  This will remove <strong>{deleteRouteTarget.name}</strong> and unassign all customers
                  on this route. You can add them to another route later.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRoute}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete route
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
