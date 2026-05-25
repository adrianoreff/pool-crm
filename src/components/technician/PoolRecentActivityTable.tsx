import { useMemo } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { usePoolReadingDefinitions, usePoolDosageDefinitions } from '@/hooks/usePoolChemistry';
import { useCustomerVisitHistory } from '@/hooks/useVisitData';
import {
  getReadingStatus,
  parseReadingNumeric,
  readingStatusClass,
} from '@/lib/pool-reading-ranges';
import { cn } from '@/lib/utils';

interface VisitRow {
  id: string;
  scheduled_date: string;
  visit_readings?: {
    value_numeric: number | null;
    value_text: string | null;
    definition?: { id: string; key: string; label: string; unit: string | null } | null;
  }[];
  visit_dosages?: {
    amount_display: string | null;
    definition?: { id: string; key: string; label: string; unit: string | null } | null;
  }[];
}

function formatVisitDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
}

interface PoolRecentActivityTableProps {
  customerId: string | undefined;
  limit?: number;
}

export function PoolRecentActivityTable({ customerId, limit = 12 }: PoolRecentActivityTableProps) {
  const { data: readingDefs = [] } = usePoolReadingDefinitions();
  const { data: dosageDefs = [] } = usePoolDosageDefinitions();
  const { data: visitHistory = [], isLoading } = useCustomerVisitHistory(customerId, limit);

  const visits = visitHistory as VisitRow[];

  const readingValue = (visit: VisitRow, defId: string, defKey: string) => {
    const row = visit.visit_readings?.find((r) => r.definition?.id === defId);
    if (!row) return { display: '', status: 'unknown' as const };
    const display = row.value_text ?? (row.value_numeric != null ? String(row.value_numeric) : '');
    const numeric = parseReadingNumeric(row.value_numeric ?? row.value_text);
    const status = getReadingStatus(defKey, numeric);
    return { display, status };
  };

  const dosageValue = (visit: VisitRow, defId: string) => {
    const row = visit.visit_dosages?.find((d) => d.definition?.id === defId);
    return row?.amount_display ?? '';
  };

  const visibleReadings = useMemo(
    () => readingDefs.slice(0, 6),
    [readingDefs]
  );

  const visibleDosages = useMemo(
    () => dosageDefs.slice(0, 4),
    [dosageDefs]
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (visits.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No completed visits yet.</p>;
  }

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-background z-10 min-w-[56px]">Date</TableHead>
            {visibleReadings.map((def) => (
              <TableHead key={def.id} className="min-w-[72px] text-xs">
                {def.label}
                {def.unit ? (
                  <span className="block font-normal text-muted-foreground">({def.unit})</span>
                ) : null}
              </TableHead>
            ))}
            {visibleDosages.map((def) => (
              <TableHead key={def.id} className="min-w-[64px] text-xs">
                {def.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visits.map((visit) => (
            <TableRow key={visit.id}>
              <TableCell className="sticky left-0 bg-background font-medium text-sm">
                {formatVisitDate(visit.scheduled_date)}
              </TableCell>
              {visibleReadings.map((def) => {
                const { display, status } = readingValue(visit, def.id, def.key);
                return (
                  <TableCell key={def.id} className={cn('text-sm', readingStatusClass(status))}>
                    {display || '—'}
                  </TableCell>
                );
              })}
              {visibleDosages.map((def) => (
                <TableCell key={def.id} className="text-sm text-muted-foreground">
                  {dosageValue(visit, def.id) || '—'}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
