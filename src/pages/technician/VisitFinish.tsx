import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useAppointment } from '@/hooks/useAppointments';
import { usePoolReadingDefinitions, usePoolDosageDefinitions } from '@/hooks/usePoolChemistry';
import { useSaveVisitData, useCompletePoolVisit, useVisitReadings, useVisitDosages } from '@/hooks/useVisitData';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Camera, Loader2, Send, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function VisitFinish() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: appointment, isLoading } = useAppointment(id || '');
  const { data: readingDefs = [] } = usePoolReadingDefinitions();
  const { data: dosageDefs = [] } = usePoolDosageDefinitions();
  const { data: existingReadings = [] } = useVisitReadings(id);
  const { data: existingDosages = [] } = useVisitDosages(id);
  const saveVisit = useSaveVisitData();
  const completeVisit = useCompletePoolVisit();
  const { uploadPhoto, isUploading } = usePhotoUpload();

  const [readingValues, setReadingValues] = useState<Record<string, string>>({});
  const [dosageEntries, setDosageEntries] = useState<{ definition_id: string; amount_display: string }[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [internalNotes, setInternalNotes] = useState('');
  const [step, setStep] = useState(0);

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
  }, [existingReadings, existingDosages]);

  const addDosage = (definitionId: string, amount: string) => {
    if (!amount) return;
    setDosageEntries((prev) => {
      const filtered = prev.filter((d) => d.definition_id !== definitionId);
      return [...filtered, { definition_id: definitionId, amount_display: amount }];
    });
  };

  const removeDosage = (definitionId: string) => {
    setDosageEntries((prev) => prev.filter((d) => d.definition_id !== definitionId));
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    const result = await uploadPhoto(file, id, { setAsPrimary: true });
    if (result) {
      setPhotoUrl(result.url);
      setPhotoId(result.id);
    }
  };

  const handleFinish = async () => {
    if (!id || !appointment?.customer?.email) {
      toast({ title: 'Customer email required', variant: 'destructive' });
      return;
    }
    if (!photoUrl) {
      toast({ title: 'Please add a pool photo', variant: 'destructive' });
      return;
    }

    try {
      await saveVisit.mutateAsync({
        appointmentId: id,
        readings: readingDefs.map((def) => ({
          definition_id: def.id,
          value_text: readingValues[def.id] || null,
          value_numeric: parseFloat(readingValues[def.id] || '') || null,
        })).filter((r) => readingValues[r.definition_id]),
        dosages: dosageEntries.map((d) => ({
          definition_id: d.definition_id,
          amount_display: d.amount_display,
        })),
        internalNotes,
      });

      const readingsForEmail = readingDefs
        .filter((def) => readingValues[def.id])
        .map((def) => ({
          label: def.label,
          value: readingValues[def.id],
          unit: def.unit,
        }));

      const dosagesForEmail = dosageEntries.map((d) => {
        const def = dosageDefs.find((x) => x.id === d.definition_id);
        return { label: def?.label || 'Chemical', amount: d.amount_display };
      });

      await completeVisit.mutateAsync({
        appointmentId: id,
        customerEmail: appointment.customer.email,
        customerName: `${appointment.customer.first_name} ${appointment.customer.last_name || ''}`.trim(),
        photoUrl,
        readings: readingsForEmail,
        dosages: dosagesForEmail,
        timeSpentMinutes: appointment.time_spent_minutes ?? undefined,
      });

      toast({ title: 'Visit complete! Customer emailed.' });
      navigate('/technician/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to complete visit';
      toast({ title: message, variant: 'destructive' });
    }
  };

  if (isLoading || !appointment) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const steps = ['Readings', 'Dosages', 'Photo', 'Send'];
  const isSubmitting = saveVisit.isPending || completeVisit.isPending;

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/technician/jobs/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Finish visit</h1>
          <p className="text-sm text-muted-foreground">
            {appointment.customer?.first_name} {appointment.customer?.last_name} · {appointment.address}
          </p>
        </div>
      </div>

      <div className="flex gap-1">
        {steps.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(i)}
            className={cn(
              'flex-1 py-2 text-xs font-medium rounded-lg border',
              step === i ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted'
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {step === 0 && (
        <Card>
          <CardHeader><CardTitle>Water readings</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {readingDefs.map((def) => (
              <div key={def.id} className="flex items-center gap-2">
                <Label className="w-36 shrink-0">{def.label}</Label>
                <Input
                  value={readingValues[def.id] || ''}
                  onChange={(e) => setReadingValues((v) => ({ ...v, [def.id]: e.target.value }))}
                  placeholder={def.unit || ''}
                />
                {def.unit && <span className="text-sm text-muted-foreground w-12">{def.unit}</span>}
              </div>
            ))}
            <Button className="w-full" onClick={() => setStep(1)}>Next: Dosages</Button>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>Dosages applied</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {dosageDefs.map((def) => {
              const presets = (def.preset_values as string[]) || [];
              const active = dosageEntries.find((d) => d.definition_id === def.id);
              return (
                <div key={def.id} className="space-y-2">
                  <Label>{def.label}{def.unit ? ` (${def.unit})` : ''}</Label>
                  <div className="flex flex-wrap gap-2">
                    {presets.map((p) => (
                      <Button
                        key={p}
                        type="button"
                        size="sm"
                        variant={active?.amount_display === p ? 'default' : 'outline'}
                        onClick={() => addDosage(def.id, p)}
                      >
                        {p}
                      </Button>
                    ))}
                  </div>
                  {active && (
                    <Badge variant="secondary" className="gap-1">
                      {active.amount_display}
                      <button type="button" onClick={() => removeDosage(def.id)}><X className="h-3 w-3" /></button>
                    </Badge>
                  )}
                </div>
              );
            })}
            <div>
              <Label>Internal notes (customer won&apos;t see)</Label>
              <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={2} />
            </div>
            <Button className="w-full" onClick={() => setStep(2)}>Next: Photo</Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>Pool photo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {photoUrl ? (
              <img src={photoUrl} alt="Pool" className="w-full rounded-lg" />
            ) : (
              <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                <Camera className="h-10 w-10 text-muted-foreground mb-2" />
                <span className="text-sm font-medium">Take a photo</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
              </label>
            )}
            {isUploading && <Loader2 className="h-6 w-6 animate-spin mx-auto" />}
            <Button className="w-full" disabled={!photoUrl} onClick={() => setStep(3)}>Next: Send report</Button>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader><CardTitle>Send service report</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Email to <strong>{appointment.customer?.email}</strong> with subject
              &quot;Your Pool Is Now Sparkling Clean!&quot;
            </p>
            {photoUrl && <img src={photoUrl} alt="Preview" className="w-full rounded-lg max-h-40 object-cover" />}
            <Button
              className="w-full h-12 bg-[#F97316] hover:bg-[#EA580C]"
              onClick={handleFinish}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Send className="h-5 w-5 mr-2" /> Finish &amp; email customer</>}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
