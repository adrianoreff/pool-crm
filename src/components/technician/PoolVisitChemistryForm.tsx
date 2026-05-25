import { useCallback, useEffect, useRef, useState } from 'react';
import { usePoolReadingDefinitions, usePoolDosageDefinitions } from '@/hooks/usePoolChemistry';
import { useSaveVisitData, useVisitReadings, useVisitDosages } from '@/hooks/useVisitData';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PoolVisitChemistryState {
  readingValues: Record<string, string>;
  dosageEntries: { definition_id: string; amount_display: string }[];
  internalNotes: string;
}

interface PoolVisitChemistryFormProps {
  appointmentId: string;
  readOnly?: boolean;
  showInternalNotes?: boolean;
  className?: string;
  onStateChange?: (state: PoolVisitChemistryState) => void;
}

export function PoolVisitChemistryForm({
  appointmentId,
  readOnly = false,
  showInternalNotes = true,
  className,
  onStateChange,
}: PoolVisitChemistryFormProps) {
  const { data: readingDefs = [] } = usePoolReadingDefinitions();
  const { data: dosageDefs = [] } = usePoolDosageDefinitions();
  const { data: existingReadings = [] } = useVisitReadings(appointmentId);
  const { data: existingDosages = [] } = useVisitDosages(appointmentId);
  const saveVisit = useSaveVisitData();

  const [readingValues, setReadingValues] = useState<Record<string, string>>({});
  const [dosageEntries, setDosageEntries] = useState<{ definition_id: string; amount_display: string }[]>([]);
  const [internalNotes, setInternalNotes] = useState('');
  const [initialized, setInitialized] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const r: Record<string, string> = {};
    existingReadings.forEach((row: { definition_id: string; value_numeric: number | null; value_text: string | null }) => {
      r[row.definition_id] = row.value_text ?? (row.value_numeric != null ? String(row.value_numeric) : '');
    });
    setReadingValues(r);
    setDosageEntries(
      existingDosages.map((row: { definition_id: string; amount_display: string | null }) => ({
        definition_id: row.definition_id,
        amount_display: row.amount_display || '',
      }))
    );
    setInitialized(true);
  }, [existingReadings, existingDosages]);

  useEffect(() => {
    onStateChange?.({ readingValues, dosageEntries, internalNotes });
  }, [readingValues, dosageEntries, internalNotes, onStateChange]);

  const persist = useCallback(
    (
      readings: Record<string, string>,
      dosages: { definition_id: string; amount_display: string }[],
      notes: string
    ) => {
      if (readOnly || !appointmentId) return;
      saveVisit.mutate({
        appointmentId,
        readings: readingDefs
          .map((def) => ({
            definition_id: def.id,
            value_text: readings[def.id] || null,
            value_numeric: parseFloat(readings[def.id] || '') || null,
          }))
          .filter((r) => readings[r.definition_id]),
        dosages: dosages.map((d) => ({
          definition_id: d.definition_id,
          amount_display: d.amount_display,
        })),
        internalNotes: notes,
      });
    },
    [readOnly, appointmentId, readingDefs, saveVisit]
  );

  const scheduleSave = useCallback(
    (
      readings: Record<string, string>,
      dosages: { definition_id: string; amount_display: string }[],
      notes: string
    ) => {
      if (readOnly) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persist(readings, dosages, notes), 600);
    },
    [readOnly, persist]
  );

  const updateReading = (defId: string, value: string) => {
    const next = { ...readingValues, [defId]: value };
    setReadingValues(next);
    scheduleSave(next, dosageEntries, internalNotes);
  };

  const addDosage = (definitionId: string, amount: string) => {
    if (!amount || readOnly) return;
    const filtered = dosageEntries.filter((d) => d.definition_id !== definitionId);
    const next = [...filtered, { definition_id: definitionId, amount_display: amount }];
    setDosageEntries(next);
    scheduleSave(readingValues, next, internalNotes);
  };

  const removeDosage = (definitionId: string) => {
    const next = dosageEntries.filter((d) => d.definition_id !== definitionId);
    setDosageEntries(next);
    scheduleSave(readingValues, next, internalNotes);
  };

  if (!initialized && existingReadings.length === 0 && existingDosages.length === 0) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Today&apos;s readings</h4>
        {readingDefs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No readings configured.</p>
        ) : (
          readingDefs.map((def) => (
            <div key={def.id} className="flex items-center gap-2">
              <Label className="w-32 shrink-0 text-sm">{def.label}</Label>
              <Input
                value={readingValues[def.id] || ''}
                onChange={(e) => updateReading(def.id, e.target.value)}
                onBlur={() => persist(readingValues, dosageEntries, internalNotes)}
                placeholder={def.unit || ''}
                disabled={readOnly}
                className="flex-1"
              />
              {def.unit && <span className="text-xs text-muted-foreground w-10">{def.unit}</span>}
            </div>
          ))
        )}
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Dosages applied</h4>
        {dosageDefs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No dosages configured.</p>
        ) : (
          dosageDefs.map((def) => {
            const presets = (def.preset_values as string[]) || [];
            const active = dosageEntries.find((d) => d.definition_id === def.id);
            return (
              <div key={def.id} className="space-y-2">
                <Label className="text-sm">
                  {def.label}
                  {def.unit ? ` (${def.unit})` : ''}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {presets.map((p) => (
                    <Button
                      key={p}
                      type="button"
                      size="sm"
                      variant={active?.amount_display === p ? 'default' : 'outline'}
                      onClick={() => addDosage(def.id, p)}
                      disabled={readOnly}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
                {active && (
                  <Badge variant="secondary" className="gap-1">
                    {active.amount_display}
                    {!readOnly && (
                      <button type="button" onClick={() => removeDosage(def.id)}>
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                )}
              </div>
            );
          })
        )}
      </div>

      {showInternalNotes && (
        <div className="space-y-2">
          <Label className="text-sm">Internal notes</Label>
          <Textarea
            value={internalNotes}
            onChange={(e) => {
              setInternalNotes(e.target.value);
              scheduleSave(readingValues, dosageEntries, e.target.value);
            }}
            onBlur={() => persist(readingValues, dosageEntries, internalNotes)}
            rows={2}
            disabled={readOnly}
            placeholder="Notes for office (customer won't see)"
          />
        </div>
      )}

      {saveVisit.isPending && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Saving…
        </p>
      )}
    </div>
  );
}

export function usePoolVisitChemistryFormRef() {
  const stateRef = useRef<PoolVisitChemistryState>({
    readingValues: {},
    dosageEntries: [],
    internalNotes: '',
  });
  return stateRef;
}
