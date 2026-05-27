import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Calendar, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, formatAppointmentDate } from '@/lib/utils';
import { useCustomerServiceHistory } from '@/hooks/useVisitData';
import { VisitHistoryDetailPanel } from './VisitHistoryDetailPanel';

interface CustomerServiceHistoryProps {
  customerId: string;
}

export function CustomerServiceHistory({ customerId }: CustomerServiceHistoryProps) {
  const navigate = useNavigate();
  const { data: visits = [], isLoading } = useCustomerServiceHistory(customerId);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (visits.length > 0 && !selectedId) {
      setSelectedId(visits[0].id);
    }
  }, [visits, selectedId]);

  const selectedVisit = visits.find((v) => v.id === selectedId) ?? null;

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (visits.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No completed pool visits yet.</p>
          <p className="text-sm mt-1">Visits appear here after a technician finishes and emails the report.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Service History</CardTitle>
        {selectedId && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-8"
            onClick={() => navigate(`/appointments?appointmentId=${selectedId}`)}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1" />
            Open in calendar
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid md:grid-cols-[200px_1fr] min-h-[360px] border-t">
          <div className="border-b md:border-b-0 md:border-r">
            <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              History
            </p>
            <ScrollArea className="h-[320px] md:h-[400px]">
              <ul className="px-2 pb-2 space-y-0.5">
                {visits.map((visit) => {
                  const isSelected = visit.id === selectedId;
                  return (
                    <li key={visit.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(visit.id)}
                        className={cn(
                          'w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        )}
                      >
                        {formatAppointmentDate(visit.scheduled_date)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </div>
          <div className="p-4 md:p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Service Info
            </p>
            <VisitHistoryDetailPanel visit={selectedVisit} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
