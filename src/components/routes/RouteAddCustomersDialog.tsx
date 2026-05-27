import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBulkAddRouteStops, useMoveCustomerToRoute } from '@/hooks/useRoutes';
import type { CustomerWithAddresses } from '@/types/database';
import {
  buildCustomerRouteAssignmentMap,
  collectCustomerCities,
  DAY_LABELS,
  normalizeCity,
  type CustomerRouteAssignment,
} from '@/lib/route-assignments';
import type { RouteWithStops } from '@/hooks/useRoutes';

interface RouteAddCustomersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: RouteWithStops;
  customers: CustomerWithAddresses[];
  routes: RouteWithStops[];
}

export function RouteAddCustomersDialog({
  open,
  onOpenChange,
  route,
  customers,
  routes,
}: RouteAddCustomersDialogProps) {
  const { toast } = useToast();
  const bulkAdd = useBulkAddRouteStops();
  const moveCustomer = useMoveCustomerToRoute();

  const [cityFilter, setCityFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moveTarget, setMoveTarget] = useState<{
    customerId: string;
    customerName: string;
    assignment: CustomerRouteAssignment;
  } | null>(null);

  const assignmentMap = useMemo(() => buildCustomerRouteAssignmentMap(routes), [routes]);

  const existingOnRoute = useMemo(() => {
    const ids = new Set<string>();
    for (const stop of route.stops || []) {
      if (stop.is_active && stop.customer_id) ids.add(stop.customer_id);
    }
    return ids;
  }, [route.stops]);

  const cities = useMemo(() => collectCustomerCities(customers), [customers]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (cityFilter !== 'all' && normalizeCity(c.city) !== cityFilter) return false;
      if (!q) return true;
      const name = `${c.first_name} ${c.last_name || ''}`.toLowerCase();
      return name.includes(q) || (c.city || '').toLowerCase().includes(q);
    });
  }, [customers, cityFilter, search]);

  const toggleSelect = (customerId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) next.delete(customerId);
      else next.add(customerId);
      return next;
    });
  };

  const handleClose = (o: boolean) => {
    if (!o) {
      setSelected(new Set());
      setSearch('');
      setCityFilter('all');
    }
    onOpenChange(o);
  };

  const handleAddSelected = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    try {
      const result = await bulkAdd.mutateAsync({
        route_id: route.id,
        customer_ids: ids,
        skipCustomerIds: existingOnRoute,
      });
      toast({
        title: 'Customers added',
        description: `${result.added} added${result.skippedOnRoute ? `, ${result.skippedOnRoute} already on route` : ''}${result.failed ? `, ${result.failed} failed` : ''}.`,
      });
      handleClose(false);
    } catch (e: unknown) {
      toast({
        title: 'Could not add customers',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmMove = async () => {
    if (!moveTarget) return;
    try {
      await moveCustomer.mutateAsync({
        route_id: route.id,
        customer_id: moveTarget.customerId,
      });
      toast({
        title: 'Customer moved',
        description: `${moveTarget.customerName} is now on ${route.name}.`,
      });
      setMoveTarget(null);
      handleClose(false);
    } catch (e: unknown) {
      toast({
        title: 'Could not move customer',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add customers to {route.name}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>City</Label>
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cities</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Search</Label>
              <Input
                placeholder="Name or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1 min-h-[240px] max-h-[360px] border rounded-md">
            <div className="p-2 space-y-1">
              {filteredCustomers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No customers match filters.</p>
              ) : (
                filteredCustomers.map((c) => {
                  const assignment = assignmentMap.get(c.id);
                  const onThisRoute = existingOnRoute.has(c.id);
                  const onOtherRoute = assignment && assignment.routeId !== route.id;
                  const canSelect = !onThisRoute && !onOtherRoute;
                  const name = `${c.first_name} ${c.last_name || ''}`.trim();
                  const city = normalizeCity(c.city);

                  return (
                    <div
                      key={c.id}
                      className="flex items-start gap-2 py-2 px-2 rounded-md hover:bg-muted/50"
                    >
                      <Checkbox
                        id={`cust-${c.id}`}
                        checked={selected.has(c.id)}
                        disabled={!canSelect}
                        onCheckedChange={() => canSelect && toggleSelect(c.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <label
                          htmlFor={`cust-${c.id}`}
                          className={`text-sm font-medium block ${canSelect ? 'cursor-pointer' : 'cursor-default'}`}
                        >
                          {name}
                          <span className="text-muted-foreground font-normal"> · {city}</span>
                        </label>
                        {onThisRoute && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            On this route
                          </Badge>
                        )}
                        {onOtherRoute && assignment && (
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              On {assignment.routeName} — {DAY_LABELS[assignment.dayOfWeek]} (
                              {assignment.technicianName})
                            </Badge>
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() =>
                                setMoveTarget({
                                  customerId: c.id,
                                  customerName: name,
                                  assignment,
                                })
                              }
                            >
                              Move here
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSelected}
              disabled={selected.size === 0 || bulkAdd.isPending}
            >
              {bulkAdd.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add selected ({selected.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!moveTarget} onOpenChange={(o) => !o && setMoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move customer to this route?</AlertDialogTitle>
            <AlertDialogDescription>
              {moveTarget && (
                <>
                  <strong>{moveTarget.customerName}</strong> will be removed from{' '}
                  <strong>
                    {moveTarget.assignment.routeName} ({DAY_LABELS[moveTarget.assignment.dayOfWeek]},{' '}
                    {moveTarget.assignment.technicianName})
                  </strong>{' '}
                  and added to <strong>{route.name}</strong>.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmMove} disabled={moveCustomer.isPending}>
              {moveCustomer.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Move here
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
