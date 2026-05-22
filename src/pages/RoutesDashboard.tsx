import { useState, useMemo } from 'react';
import { useRoutes, useGenerateRouteVisits, dateToDayOfWeek } from '@/hooks/useRoutes';
import { useTeam } from '@/hooks/useTeam';
import { useAppointments } from '@/hooks/useAppointments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Route } from 'lucide-react';
import { getLocalDateString } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function RoutesDashboard() {
  const [date, setDate] = useState(getLocalDateString());
  const { data: routes = [], isLoading } = useRoutes();
  const { data: team = [] } = useTeam();
  const generateVisits = useGenerateRouteVisits();
  const { toast } = useToast();

  const dayOfWeek = dateToDayOfWeek(date);
  const routesForDay = useMemo(
    () => routes.filter((r) => r.day_of_week === dayOfWeek && r.is_active),
    [routes, dayOfWeek]
  );

  const { data: appointments = [] } = useAppointments({ dateFrom: date, dateTo: date });

  const routeStats = useMemo(() => {
    return routesForDay.map((route) => {
      const techAppts = appointments.filter(
        (a) => a.technician_id === route.technician_id && a.scheduled_date === date
      );
      const total = techAppts.length;
      const completed = techAppts.filter((a) => a.status === 'completed').length;
      const skipped = techAppts.filter((a) => a.status === 'no_show').length;
      const tech = team.find((t) => t.id === route.technician_id);
      return {
        route,
        techName: tech ? `${tech.first_name} ${tech.last_name}` : 'Technician',
        total,
        completed,
        remaining: total - completed,
        skipped,
        progress: total ? (completed / total) * 100 : 0,
      };
    });
  }, [routesForDay, appointments, team, date]);

  const handleGenerate = async () => {
    if (routesForDay.length === 0) {
      toast({
        title: `No routes for ${dayOfWeek}`,
        description: 'Pick a date that matches your route weekday, or add routes in Route Manager.',
        variant: 'destructive',
      });
      return;
    }
    const stopCount = routesForDay.reduce(
      (n, r) => n + (r.stops?.filter((s) => s.is_active).length ?? 0),
      0
    );
    if (stopCount === 0) {
      toast({
        title: 'No customers on route',
        description: 'Open Route Manager and add customers to your route before generating stops.',
        variant: 'destructive',
      });
      return;
    }
    try {
      let created = 0;
      for (const route of routesForDay) {
        const result = await generateVisits.mutateAsync({ routeId: route.id, date });
        created += Array.isArray(result) ? result.filter((r: { created?: boolean }) => r.created).length : 0;
      }
      toast({
        title: 'Stops generated',
        description: `${created} new visit(s) on ${date} across ${routesForDay.length} route(s).`,
      });
    } catch (e: unknown) {
      toast({
        title: 'Failed to generate stops',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Route className="h-7 w-7 text-primary" />
            Route Dashboard
          </h1>
          <p className="text-muted-foreground">Track pools per technician for each day</p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <Label htmlFor="route-date">Date</Label>
            <Input
              id="route-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-40"
            />
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generateVisits.isPending || routesForDay.length === 0}
          >
            {generateVisits.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Generate stops
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : routeStats.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No routes scheduled for {dayOfWeek}. Create routes in Route Manager.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {routeStats.map(({ route, techName, total, completed, remaining, skipped, progress }) => (
            <Card key={route.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{techName}</CardTitle>
                    <p className="text-sm text-muted-foreground capitalize">
                      {route.name} · {route.day_of_week}
                    </p>
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    {completed}/{total}
                    <span className="text-sm font-normal text-muted-foreground block">pools</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={progress} className="h-2" />
                <div className="flex gap-4 text-sm">
                  <span>{remaining} remaining</span>
                  {skipped > 0 && <Badge variant="outline">{skipped} skip</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  Miles tracking: configure Mapbox token in Settings for route distance.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
