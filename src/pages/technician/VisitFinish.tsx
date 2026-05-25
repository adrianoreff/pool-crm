import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAppointment } from '@/hooks/useAppointments';
import { usePoolReadingDefinitions, usePoolDosageDefinitions } from '@/hooks/usePoolChemistry';
import { useSaveVisitData, useCompletePoolVisit } from '@/hooks/useVisitData';
import { useJobChecklist } from '@/hooks/useJobChecklist';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PoolVisitChemistryForm, type PoolVisitChemistryState } from '@/components/technician/PoolVisitChemistryForm';
import { ArrowLeft, Camera, Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function VisitFinish() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: appointment, isLoading } = useAppointment(id || '');
  const { data: readingDefs = [] } = usePoolReadingDefinitions();
  const { data: dosageDefs = [] } = usePoolDosageDefinitions();
  const { requiredIncomplete } = useJobChecklist(id || '', appointment?.service_id || null);
  const saveVisit = useSaveVisitData();
  const completeVisit = useCompletePoolVisit();
  const { uploadPhoto, isUploading } = usePhotoUpload();

  const [chemistryState, setChemistryState] = useState<PoolVisitChemistryState>({
    readingValues: {},
    dosageEntries: [],
    internalNotes: '',
  });
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    const result = await uploadPhoto(file, id, { setAsPrimary: true });
    if (result) {
      setPhotoUrl(result.url);
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
    if (requiredIncomplete.length > 0) {
      toast({
        title: 'Checklist incomplete',
        description: `Complete required items: ${requiredIncomplete.map((i) => i.description).join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    try {
      await saveVisit.mutateAsync({
        appointmentId: id,
        readings: readingDefs
          .map((def) => ({
            definition_id: def.id,
            value_text: chemistryState.readingValues[def.id] || null,
            value_numeric: parseFloat(chemistryState.readingValues[def.id] || '') || null,
          }))
          .filter((r) => chemistryState.readingValues[r.definition_id]),
        dosages: chemistryState.dosageEntries.map((d) => ({
          definition_id: d.definition_id,
          amount_display: d.amount_display,
        })),
        internalNotes: chemistryState.internalNotes,
      });

      const readingsForEmail = readingDefs
        .filter((def) => chemistryState.readingValues[def.id])
        .map((def) => ({
          label: def.label,
          value: chemistryState.readingValues[def.id],
          unit: def.unit,
        }));

      const dosagesForEmail = chemistryState.dosageEntries.map((d) => {
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

  const steps = ['Chemistry', 'Photo', 'Send'];
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

      {requiredIncomplete.length > 0 && (
        <p className="text-sm text-amber-600 px-1">
          {requiredIncomplete.length} required checklist item(s) remaining — go back to Pool tab to complete.
        </p>
      )}

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

      {step === 0 && id && (
        <Card>
          <CardHeader><CardTitle>Water readings &amp; dosages</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <PoolVisitChemistryForm
              appointmentId={id}
              onStateChange={setChemistryState}
            />
            <Button className="w-full" onClick={() => setStep(1)}>Next: Photo</Button>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
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
            <Button className="w-full" disabled={!photoUrl} onClick={() => setStep(2)}>Next: Send report</Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
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
              disabled={isSubmitting || requiredIncomplete.length > 0}
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Send className="h-5 w-5 mr-2" /> Finish &amp; email customer</>}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
