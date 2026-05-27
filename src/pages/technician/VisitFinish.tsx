import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAppointment } from '@/hooks/useAppointments';
import { useSaveVisitData } from '@/hooks/useVisitData';
import { useJobChecklist } from '@/hooks/useJobChecklist';
import { useFinishPoolVisit } from '@/hooks/useFinishPoolVisit';
import {
  PoolVisitEmailSection,
  usePoolVisitEmailState,
} from '@/components/technician/PoolVisitEmailSection';
import { PoolVisitFinishActions } from '@/components/technician/PoolVisitFinishActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PoolVisitChemistryForm, type PoolVisitChemistryState } from '@/components/technician/PoolVisitChemistryForm';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DEFAULT_POOL_REPORT_HEADER,
  DEFAULT_POOL_REPORT_MESSAGE,
} from '@/lib/pool-service-report-template';
import { usePoolReadingDefinitions } from '@/hooks/usePoolChemistry';

export default function VisitFinish() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: appointment, isLoading } = useAppointment(id || '');
  const { data: readingDefs = [] } = usePoolReadingDefinitions();
  const { requiredIncomplete } = useJobChecklist(id || '', appointment?.service_id || null, {
    serviceName: appointment?.service?.name,
    customerId: appointment?.customer_id,
  });
  const emailState = usePoolVisitEmailState(id);
  const saveVisit = useSaveVisitData();
  const { finishVisit, isSubmitting: isFinishing } = useFinishPoolVisit(id);

  const [chemistryState, setChemistryState] = useState<PoolVisitChemistryState>({
    readingValues: {},
    dosageEntries: [],
    internalNotes: '',
  });
  const [step, setStep] = useState(0);

  const persistChemistry = async () => {
    if (!id) return;
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
      emailSubject: emailState.emailSubject || DEFAULT_POOL_REPORT_HEADER,
      emailMessage: emailState.emailMessage || DEFAULT_POOL_REPORT_MESSAGE,
    });
  };

  const handleTopPhotoUploaded = async (url: string) => {
    if (!id || isFinishing) return;
    await persistChemistry();
    await finishVisit({ requirePhoto: true, photoUrl: url });
  };

  const handleFinishWithPhoto = async () => {
    if (!id) return;
    await persistChemistry();
    await finishVisit({ requirePhoto: true });
  };

  const handleFinishWithoutPhoto = async () => {
    if (!id) return;
    await persistChemistry();
    await finishVisit({ requirePhoto: false });
  };

  if (isLoading || !appointment) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const steps = ['Chemistry', 'Email & photos', 'Send'];
  const isSubmitting = saveVisit.isPending || isFinishing;

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
          {requiredIncomplete.length} required checklist item(s) remaining — complete on the Pool tab.
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
              customerId={appointment?.customer_id}
              onStateChange={setChemistryState}
            />
            <Button className="w-full" onClick={() => setStep(1)}>Next: Email &amp; photos</Button>
          </CardContent>
        </Card>
      )}

      {step === 1 && id && (
        <div className="space-y-4">
          <PoolVisitEmailSection
            appointmentId={id}
            customerEmail={appointment.customer?.email}
            onTopPhotoUploaded={handleTopPhotoUploaded}
          />
          <PoolVisitFinishActions
            hasTopPhoto={emailState.hasTopPhoto}
            isSubmitting={isSubmitting}
            checklistBlocked={requiredIncomplete.length > 0}
            onFinishWithEmail={handleFinishWithPhoto}
            onFinishWithoutPhoto={handleFinishWithoutPhoto}
          />
        </div>
      )}

      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>Send service report</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Email to <strong>{appointment.customer?.email}</strong>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Subject: </span>
              {emailState.emailSubject || DEFAULT_POOL_REPORT_HEADER}
            </p>
            {emailState.topPhotoUrl && (
              <img src={emailState.topPhotoUrl} alt="Top" className="w-full rounded-lg max-h-40 object-cover" />
            )}
            <PoolVisitFinishActions
              hasTopPhoto={emailState.hasTopPhoto}
              isSubmitting={isSubmitting}
              checklistBlocked={requiredIncomplete.length > 0}
              onFinishWithEmail={handleFinishWithPhoto}
              onFinishWithoutPhoto={handleFinishWithoutPhoto}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
