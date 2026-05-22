import { useState } from 'react';
import {
  useRoutes,
  useCreateRoute,
  useAddRouteStop,
  useRemoveRouteStop,
  dateToDayOfWeek,
} from '@/hooks/useRoutes';
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
import { Plus, Trash2, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

const DAYS: Database['public']['Enums']['day_of_week'][] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

export default function RouteManager() {
  const { data: routes = [], isLoading } = useRoutes();
  const { data: team = [] } = useTeam();
  const { data: customers = [] } = useCustomers();
  const createRoute = useCreateRoute();
  const addStop = useAddRouteStop();
  const removeStop = useRemoveRouteStop();
  const { toast } = useToast();

  const technicians = team.filter((t) => t.role === 'technician' && t.is_active);

  const [newRouteOpen, setNewRouteOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTech, setNewTech] = useState('');
  const [newDay, setNewDay] = useState<Database['public']['Enums']['day_of_week']>('wednesday');
  const [addCustomerRouteId, setAddCustomerRouteId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState('');

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
      toast({ title: e instanceof Error ? e.message : 'Error', variant: 'destructive' });
    }
  };

  const handleAddStop = async (routeId: string) => {
    if (!selectedCustomer) return;
    try {
      await addStop.mutateAsync({ route_id: routeId, customer_id: selectedCustomer });
      toast({ title: 'Customer added to route' });
      setAddCustomerRouteId(null);
      setSelectedCustomer('');
    } catch (e: unknown) {
      toast({ title: e instanceof Error ? e.message : 'Error', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-7 w-7 text-primary" />
            Route Manager
          </h1>
          <p className="text-muted-foreground">Assign customers to technician routes by weekday</p>
        </div>
        <Dialog open={newRouteOpen} onOpenChange={setNewRouteOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New route</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create route</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Route name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Wednesday North" />
              </div>
              <div>
                <Label>Technician</Label>
                <Select value={newTech} onValueChange={setNewTech}>
                  <SelectTrigger><SelectValue placeholder="Select tech" /></SelectTrigger>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => (
                      <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleCreateRoute}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid gap-4">
          {routes.map((route) => (
            <Card key={route.id}>
              <CardHeader>
                <CardTitle className="capitalize">
                  {route.name} — {route.day_of_week}
                  {route.technician && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({route.technician.first_name} {route.technician.last_name})
                    </span>
                  )}
                </CardTitle>
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
                <Dialog
                  open={addCustomerRouteId === route.id}
                  onOpenChange={(o) => !o && setAddCustomerRouteId(null)}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAddCustomerRouteId(route.id)}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add customer
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add to route</DialogTitle></DialogHeader>
                    <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                      <SelectTrigger><SelectValue placeholder="Customer" /></SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.first_name} {c.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button className="w-full mt-4" onClick={() => handleAddStop(route.id)}>
                      Add
                    </Button>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
