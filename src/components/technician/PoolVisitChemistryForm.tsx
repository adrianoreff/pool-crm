import { useCallback, useEffect, useRef, useState } from 'react';
import { usePoolReadingDefinitions, usePoolDosageDefinitions } from '@/hooks/usePoolChemistry';
import { useSaveVisitData, useVisitReadings, useVisitDosages } from '@/hooks/useVisitData';
import { useCustomerLastChemistry } from '@/hooks/useCustomerLastChemistry';
import { ChemistryDefinitionRow } from '@/components/technician/ChemistryDefinitionRow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { getReadingPresets, getDosagePresets } from '@/lib/pool-reading-presets';
import { cn } from '@/lib/utils';

export interface PoolVisitChemistryState {
  readingValues: Record<string, string>;
  dosageEntries: { definition_id: string; amount_display: string }[];
  internalNotes: string;
}

type ActiveTarget = { type: 'reading' | 'dosage'; id: string } | null;

interface PoolVisitChemistryFormProps {
  appointmentId: string;
  customerId?: string;
  readOnly?: boolean;
  showInternalNotes?: boolean;
  className?: string;
  onStateChange?: (state: PoolVisitChemistryState) => void;
}

function findFirstEmptyReading(
  defs: { id: string }[],
  values: Record<string, string>
): string | null {
  const empty = defs.find((d) => !values[d.id]);
  return empty?.id ?? null;
}

function findFirstEmptyDosage(
  defs: { id: string }[],
  entries: { definition_id: string; amount_display: string }[]
): string | null {
  const empty = defs.find((d) => !entries.some((e) => e.definition_id === d.id && e.amount_display));
  return empty?.id ?? null;
}

function findNextTarget(
  readingDefs: { id: string }[],
  dosageDefs: { id: string }[],
  readingValues: Record<string, string>,
  dosageEntries: { definition_id: string; amount_display: string }[],
  after?: ActiveTarget
): ActiveTarget {
  if (after?.type === 'reading') {
    const idx = readingDefs.findIndex((d) => d.id === after.id);
    for (let i = idx + 1; i < readingDefs.length; i++) {
      if (!readingValues[readingDefs[i].id]) return { type: 'reading', id: readingDefs[i].id };
    }
    const dosageId = findFirstEmptyDosage(dosageDefs, dosageEntries);
    if (dosageId) return { type: 'dosage', id: dosageId };
    return null;
  }

  if (after?.type === 'dosage') {
    const idx = dosageDefs.findIndex((d) => d.id === after.id);
    for (let i = idx + 1; i < dosageDefs.length; i++) {
      const filled = dosageEntries.some(
        (e) => e.definition_id === dosageDefs[i].id && e.amount_display
      );
      if (!filled) return { type: 'dosage', id: dosageDefs[i].id };
    }
    return null;
  }

  const readingId = findFirstEmptyReading(readingDefs, readingValues);
  if (readingId) return { type: 'reading', id: readingId };
  const dosageId = findFirstEmptyDosage(dosageDefs, dosageEntries);
  if (dosageId) return { type: 'dosage', id: dosageId };
  return null;
}

export function PoolVisitChemistryForm({
  appointmentId,
  customerId,
  readOnly = false,
  showInternalNotes = true,
  className,
  onStateChange,
}: PoolVisitChemistryFormProps) {
  const { data: readingDefs = [] } = usePoolReadingDefinitions();
  const { data: dosageDefs = [] } = usePoolDosageDefinitions();
  const { data: existingReadings = [], isLoading: readingsLoading } = useVisitReadings(appointmentId);
  const { data: existingDosages = [], isLoading: dosagesLoading } = useVisitDosages(appointmentId);
  const { data: lastChemistry } = useCustomerLastChemistry(customerId, appointmentId);
  const saveVisit = useSaveVisitData();

  const [readingValues, setReadingValues] = useState<Record<string, string>>({});
  const [dosageEntries, setDosageEntries] = useState<{ definition_id: string; amount_display: string }[]>([]);
  const [internalNotes, setInternalNotes] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [activeTarget, setActiveTarget] = useState<ActiveTarget>(null);
  const [expandedReadings, setExpandedReadings] = useState(true);
  const [expandedDosages, setExpandedDosages] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current || readingsLoading || dosagesLoading) return;

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
    hydratedRef.current = true;
    setInitialized(true);
  }, [existingReadings, existingDosages, readingsLoading, dosagesLoading]);

  useEffect(() => {
    if (!initialized) return;
    setActiveTarget((prev) => {
      if (prev) {
        const stillEmpty =
          prev.type === 'reading'
            ? !readingValues[prev.id]
            : !dosageEntries.some((e) => e.definition_id === prev.id && e.amount_display);
        if (stillEmpty) return prev;
      }
      return findNextTarget(readingDefs, dosageDefs, readingValues, dosageEntries);
    });
  }, [initialized, readingDefs, dosageDefs, readingValues, dosageEntries]);

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

  const focusNext = useCallback(
    (from: ActiveTarget) => {
      const next = findNextTarget(readingDefs, dosageDefs, readingValues, dosageEntries, from ?? undefined);
      setActiveTarget(next);
    },
    [readingDefs, dosageDefs, readingValues, dosageEntries]
  );

  const selectReading = (defId: string, value: string) => {
    const next = { ...readingValues, [defId]: value };
    setReadingValues(next);
    scheduleSave(next, dosageEntries, internalNotes);
    focusNext({ type: 'reading', id: defId });
  };

  const clearReading = (defId: string) => {
    const next = { ...readingValues };
    delete next[defId];
    setReadingValues(next);
    scheduleSave(next, dosageEntries, internalNotes);
    setActiveTarget({ type: 'reading', id: defId });
  };

  const selectDosage = (defId: string, value: string) => {
    const filtered = dosageEntries.filter((d) => d.definition_id !== defId);
    const next = [...filtered, { definition_id: defId, amount_display: value }];
    setDosageEntries(next);
    scheduleSave(readingValues, next, internalNotes);
    focusNext({ type: 'dosage', id: defId });
  };

  const clearDosage = (defId: string) => {
    const next = dosageEntries.filter((d) => d.definition_id !== defId);
    setDosageEntries(next);
    scheduleSave(readingValues, next, internalNotes);
    setActiveTarget({ type: 'dosage', id: defId });
  };

  if (!initialized && (readingsLoading || dosagesLoading)) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const readingLast = lastChemistry?.readingLast ?? {};
  const dosageLast = lastChemistry?.dosageLast ?? {};

  return (
    <div className={cn('space-y-4', className)}>
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="pb-0 pt-3 px-4 bg-[#F97316] text-white rounded-t-lg">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold text-white">Readings</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-white hover:bg-[#EA580C] hover:text-white h-8 px-2"
              onClick={() => setExpandedReadings((v) => !v)}
            >
              {expandedReadings ? (
                <>
                  Collapse <ChevronUp className="h-4 w-4 ml-1" />
                </>
              ) : (
                <>
                  Expand <ChevronDown className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedReadings && (
          <CardContent className="p-0">
            {readingDefs.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4 py-6">No readings configured.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {readingDefs.map((def) => (
                  <ChemistryDefinitionRow
                    key={def.id}
                    label={def.label}
                    unit={def.unit}
                    presets={getReadingPresets(def.key, def.preset_values)}
                    value={readingValues[def.id]}
                    lastLabel={!readingValues[def.id] ? readingLast[def.id]?.label : undefined}
                    isActive={activeTarget?.type === 'reading' && activeTarget.id === def.id}
                    readOnly={readOnly}
                    onSelect={(v) => selectReading(def.id, v)}
                    onClear={() => clearReading(def.id)}
                    onActivate={() => setActiveTarget({ type: 'reading', id: def.id })}
                  />
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="pb-0 pt-3 px-4 bg-[#F97316] text-white rounded-t-lg">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold text-white">Dosages</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-white hover:bg-[#EA580C] hover:text-white h-8 px-2"
              onClick={() => setExpandedDosages((v) => !v)}
            >
              {expandedDosages ? (
                <>
                  Collapse <ChevronUp className="h-4 w-4 ml-1" />
                </>
              ) : (
                <>
                  Expand <ChevronDown className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedDosages && (
          <CardContent className="p-0">
            {dosageDefs.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4 py-6">No dosages configured.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {dosageDefs.map((def) => {
                  const active = dosageEntries.find((d) => d.definition_id === def.id);
                  return (
                    <ChemistryDefinitionRow
                      key={def.id}
                      label={def.label}
                      unit={def.unit}
                      presets={getDosagePresets(def.preset_values)}
                      value={active?.amount_display}
                      lastLabel={!active?.amount_display ? dosageLast[def.id]?.label : undefined}
                      isActive={activeTarget?.type === 'dosage' && activeTarget.id === def.id}
                      readOnly={readOnly}
                      onSelect={(v) => selectDosage(def.id, v)}
                      onClear={() => clearDosage(def.id)}
                      onActivate={() => setActiveTarget({ type: 'dosage', id: def.id })}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>

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
