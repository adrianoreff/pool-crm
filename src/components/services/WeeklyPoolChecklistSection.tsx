import { useState } from 'react';
import { ListChecks, Pencil, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ServiceChecklistManager } from '@/components/services/ServiceChecklistManager';
import { useServiceChecklist } from '@/hooks/useServiceChecklist';
import { useServices } from '@/hooks/useServices';
import { WEEKLY_POOL_SERVICE_NAME } from '@/lib/service-checklist-utils';
import { ServiceWithCategory } from '@/types/database';

export function WeeklyPoolChecklistSection() {
  const { data: services = [] } = useServices({ poolOnly: false });
  const weeklyService = services.find(
    (s) => s.name.trim().toLowerCase() === WEEKLY_POOL_SERVICE_NAME.toLowerCase()
  ) as ServiceWithCategory | undefined;

  const [managerOpen, setManagerOpen] = useState(false);
  const { items, isLoading, seedDefaults } = useServiceChecklist(
    weeklyService?.id ?? null,
    WEEKLY_POOL_SERVICE_NAME
  );

  if (!weeklyService) {
    return null;
  }

  return (
    <>
      <Card className="border-primary/20 shadow-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              Weekly Pool Service — Checklist
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Default checklist technicians see on every pool stop (Today&apos;s Checklist).
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setManagerOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit checklist
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : items.length === 0 ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-sm text-muted-foreground flex-1">
                No checklist yet. Load the standard 6 tasks (Empty Baskets, Skim Surface, Vacuum,
                Backwash, Brushed Walls, Filled Tab Floater).
              </p>
              <Button
                onClick={() => seedDefaults.mutate()}
                disabled={seedDefaults.isPending}
              >
                Load default checklist
              </Button>
            </div>
          ) : (
            <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-md bg-muted/40"
                >
                  <span className="h-2 w-2 rounded-full bg-violet-500 shrink-0" />
                  {item.description}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ServiceChecklistManager
        open={managerOpen}
        onOpenChange={setManagerOpen}
        serviceId={weeklyService.id}
        serviceName={weeklyService.name}
      />
    </>
  );
}
