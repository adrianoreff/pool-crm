import { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Route, Map } from 'lucide-react';
import { RoutesTodayTab } from '@/components/routes/RoutesTodayTab';
import RouteManager from '@/pages/RouteManager';
import { Button } from '@/components/ui/button';

type RoutesTab = 'today' | 'setup';

export default function Routes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: RoutesTab = tabParam === 'setup' ? 'setup' : 'today';

  useEffect(() => {
    if (tabParam !== 'today' && tabParam !== 'setup') {
      setSearchParams({ tab: 'today' }, { replace: true });
    }
  }, [tabParam, setSearchParams]);

  const setTab = (value: RoutesTab) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Route className="h-7 w-7 text-primary" />
            Routes
          </h1>
          <p className="text-muted-foreground">Weekly pool routes and daily progress</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/routes/map">
            <Map className="h-4 w-4 mr-2" />
            Map view
          </Link>
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as RoutesTab)}>
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="setup">Setup</TabsTrigger>
        </TabsList>
        <TabsContent value="today" className="mt-6">
          <RoutesTodayTab />
        </TabsContent>
        <TabsContent value="setup" className="mt-6">
          <RouteManager embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
