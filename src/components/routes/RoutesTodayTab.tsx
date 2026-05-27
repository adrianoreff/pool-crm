import { useEffect, useMemo, useRef, useState } from 'react';
import { useRoutes, dateToDayOfWeek } from '@/hooks/useRoutes';
import { useTeam } from '@/hooks/useTeam';
import { useAppointments } from '@/hooks/useAppointments';
import { useEnsureRouteVisitsForDate } from '@/hooks/useEnsureRouteVisits';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Loader2, ChevronDown, CalendarClock } from 'lucide-react';
import { getLocalDateString } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  computeRouteDayStats,
  formatRouteDayBanner,
  STOP_STATUS_LABELS,
  type RouteDayStats,
} from '@/lib/route-day-stats';
import { DAY_LABELS } from '@/lib/route-assignments';
import { RescheduleVisitDialog } from '@/components/routes/RescheduleVisitDialog';
import type { AppointmentWithRelations } from '@/types/database';

function statusBadgeVariant(
  status: RouteDayStats['stops'][0]['status']
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'completed':
      return 'default';
    case 'cancelled':
      return 'destructive';
    case 'not_scheduled':
      return 'outline';
    default:
      return 'secondary';
  }
}

export function RoutesTodayTab() {
  const [date, setDate] = useState(getLocalDateString());
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);
  const [rescheduleAppointment, setRescheduleAppointment] =
    useState<AppointmentWithRelations | null>(null);
  const [rescheduleCustomerName, setRescheduleCustomerName] = useState('');

  const { data: routes = [], isLoading } = useRoutes();
  const { data: team = [] } = useTeam();
  const ensureForDate = useEnsureRouteVisitsForDate();
  const { toast } = useToast();
  const lastEnsuredDate = useRef<string | null>(null);

  const dayOfWeek = dateToDayOfWeek(date);
  const activeRoutes = useMemo(() => routes.filter((r) => r.is_active !== false), [routes]);

  const routesForDay = useMemo(
    () => activeRoutes.filter((r) => r.day_of_week === dayOfWeek),
    [activeRoutes, dayOfWeek]
  );

  const { data: appointments = [], isLoading: loadingAppts, refetch } = useAppointments({
    dateFrom: date,
    dateTo: date,
  });

  useEffect(() => {
    if (!date || lastEnsuredDate.current === date) return;
    lastEnsuredDate.current = date;

    ensureForDate.mutate(date, {
      onError: (e) => {
        toast({
          title: 'Could not sync visits',
          description: e instanceof Error ? e.message : 'Unknown error',
          variant: 'destructive',
        });
        lastEnsuredDate.current = null;
      },
      onSuccess: () => {
        refetch();
      },
    });
  }, [date]);

  const routeStats = useMemo(() => {
    return routesForDay.map((route) => {
      const tech = team.find((t) => t.id === route.technician_id);
      const techName = tech
        ? `${tech.first_name || ''} ${tech.last_name || ''}`.trim() || 'Technician'
        : 'Technician';
      return computeRouteDayStats(route, appointments, date, techName);
    });
  }, [routesForDay, appointments, team, date]);

  const syncing = ensureForDate.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">
            Weekly routes sync visits automatically for the next 12 weeks. Pick any date on the
            route&apos;s weekday to see progress.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <Label htmlFor="route-date">Date</Label>
            <Input
              id="route-date"
              type="date"
              value={date}
              onChange={(e) => {
                lastEnsuredDate.current = null;
                setDate(e.target.value);
              }}
              className="w-44"
            />
          </div>
          {syncing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground pb-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Syncing…
            </div>
          )}
        </div>
      </div>

      {routesForDay.length > 0 && (
        <p className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
          {formatRouteDayBanner(dayOfWeek, date)}
        </p>
      )}

      {isLoading || loadingAppts ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : routeStats.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground space-y-2">
            <p>
              No routes on <span className="capitalize font-medium">{DAY_LABELS[dayOfWeek]}</span>.
            </p>
            <p className="text-sm">
              Select a date that matches your route day (e.g. Thursday for Oceanside), or add routes
              in the Setup tab.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {routeStats.map((stats) => (
            <Card key={stats.route.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <CardTitle className="text-lg">{stats.techName}</CardTitle>
                    <p className="text-sm text-muted-foreground capitalize">
                      {stats.route.name} · {stats.route.day_of_week}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold text-primary">
                      {stats.completed}/{stats.planned}
                    </div>
                    <span className="text-sm font-normal text-muted-foreground">pools</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={stats.progress} className="h-2" />
                <div className="flex flex-wrap gap-2 text-sm">
                  <span>{stats.remaining} remaining</span>
                  {stats.scheduled < stats.planned && (
                    <Badge variant="outline">
                      {stats.scheduled}/{stats.planned} scheduled
                    </Badge>
                  )}
                  {stats.skipped > 0 && (
                    <Badge variant="outline">{stats.skipped} skip</Badge>
                  )}
                </div>

                <Collapsible
                  open={expandedRouteId === stats.route.id}
                  onOpenChange={(open) =>
                    setExpandedRouteId(open ? stats.route.id : null)
                  }
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between px-2">
                      <span>View {stats.planned} customers</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          expandedRouteId === stats.route.id ? 'rotate-180' : ''
                        }`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2 space-y-2">
                    {stats.stops.map((stop, idx) => (
                      <div
                        key={stop.stopId}
                        className="flex items-center justify-between gap-2 py-2 border-b last:border-0 text-sm"
                      >
                        <div className="min-w-0">
                          <span className="font-medium">
                            {idx + 1}. {stop.customerName}
                          </span>
                          {stop.city && (
                            <span className="text-muted-foreground"> · {stop.city}</span>
                          )}
                          <div className="mt-1">
                            <Badge variant={statusBadgeVariant(stop.status)} className="text-xs">
                              {STOP_STATUS_LABELS[stop.status]}
                            </Badge>
                          </div>
                        </div>
                        {stop.appointment && stop.status !== 'cancelled' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={() => {
                              setRescheduleAppointment(stop.appointment);
                              setRescheduleCustomerName(stop.customerName);
                            }}
                          >
                            <CalendarClock className="h-3 w-3 mr-1" />
                            Reschedule
                          </Button>
                        )}
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RescheduleVisitDialog
        open={!!rescheduleAppointment}
        onOpenChange={(o) => {
          if (!o) {
            setRescheduleAppointment(null);
            setRescheduleCustomerName('');
          }
        }}
        appointment={rescheduleAppointment}
        customerName={rescheduleCustomerName}
      />
    </div>
  );
}
