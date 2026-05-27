import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppointment } from '@/hooks/useAppointments';
import {
  useVisitReadings,
  useVisitDosages,
  useSaveVisitData,
  useCompletePoolVisit,
} from '@/hooks/useVisitData';
import { useJobChecklist } from '@/hooks/useJobChecklist';
import { usePoolVisitEmailState } from '@/components/technician/PoolVisitEmailSection';
import { useToast } from '@/hooks/use-toast';
import {
  DEFAULT_POOL_REPORT_HEADER,
  DEFAULT_POOL_REPORT_MESSAGE,
} from '@/lib/pool-service-report-template';
import { supabase } from '@/integrations/supabase/client';

export type FinishVisitOptions = {
  /** When true, abort if no top email photo */
  requirePhoto?: boolean;
  photoUrl?: string;
  extraPhotoUrl?: string;
};

export function useFinishPoolVisit(appointmentId: string | undefined) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: appointment } = useAppointment(appointmentId || '');
  const { data: visitReadings = [] } = useVisitReadings(appointmentId);
  const { data: visitDosages = [] } = useVisitDosages(appointmentId);
  const emailState = usePoolVisitEmailState(appointmentId);
  const saveVisit = useSaveVisitData();
  const completeVisit = useCompletePoolVisit();

  const { requiredIncomplete } = useJobChecklist(appointmentId || '', appointment?.service_id || null, {
    serviceName: appointment?.service?.name,
    customerId: appointment?.customer_id,
  });

  const finishVisit = useCallback(
    async (options: FinishVisitOptions = {}) => {
      const { requirePhoto = false } = options;
      const photoUrl = options.photoUrl ?? emailState.topPhotoUrl;
      const extraPhotoUrl = options.extraPhotoUrl ?? emailState.extraPhotoUrl;

      if (!appointmentId || !appointment) {
        toast({ title: 'Appointment not found', variant: 'destructive' });
        return false;
      }

      if (!appointment.customer?.email) {
        toast({ title: 'Customer email required', variant: 'destructive' });
        return false;
      }

      if (requirePhoto && !photoUrl) {
        toast({ title: 'Please add the top email photo', variant: 'destructive' });
        return false;
      }

      if (requiredIncomplete.length > 0) {
        toast({
          title: 'Checklist incomplete',
          description: `Complete required items: ${requiredIncomplete.map((i) => i.description).join(', ')}`,
          variant: 'destructive',
        });
        return false;
      }

      const emailSubject = emailState.emailSubject || DEFAULT_POOL_REPORT_HEADER;
      const emailMessage = emailState.emailMessage || DEFAULT_POOL_REPORT_MESSAGE;

      try {
        await saveVisit.mutateAsync({
          appointmentId,
          emailSubject,
          emailMessage,
        });

        const readingsForEmail = visitReadings
          .map((r) => {
            const def = r.definition as { label?: string; unit?: string | null } | undefined;
            const value =
              r.value_text ?? (r.value_numeric != null ? String(r.value_numeric) : '');
            return { label: def?.label || 'Reading', value, unit: def?.unit };
          })
          .filter((r) => r.value);

        const dosagesForEmail = visitDosages
          .map((d) => {
            const def = d.definition as { label?: string } | undefined;
            return { label: def?.label || 'Chemical', amount: d.amount_display || '' };
          })
          .filter((d) => d.amount);

        if (
          appointment.status !== 'in_progress' &&
          appointment.status !== 'completed' &&
          appointment.status !== 'cancelled'
        ) {
          const now = new Date().toISOString();
          const { error: statusError } = await supabase
            .from('appointments')
            .update({
              status: 'in_progress',
              started_at: appointment.started_at || now,
              updated_at: now,
            })
            .eq('id', appointmentId);
          if (statusError) throw statusError;
        }

        await completeVisit.mutateAsync({
          appointmentId,
          customerEmail: appointment.customer.email,
          customerName:
            `${appointment.customer.first_name} ${appointment.customer.last_name || ''}`.trim(),
          photoUrl: photoUrl || undefined,
          extraPhotoUrl: extraPhotoUrl || undefined,
          readings: readingsForEmail,
          dosages: dosagesForEmail,
          emailSubject,
          emailBody: emailMessage,
          timeSpentMinutes: appointment.time_spent_minutes ?? undefined,
        });

        toast({
          title: photoUrl
            ? 'Visit complete! Customer emailed.'
            : 'Visit complete! Report sent without photos.',
        });
        navigate('/technician/dashboard');
        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to complete visit';
        toast({ title: message, variant: 'destructive' });
        return false;
      }
    },
    [
      appointmentId,
      appointment,
      emailState,
      visitReadings,
      visitDosages,
      requiredIncomplete,
      saveVisit,
      completeVisit,
      navigate,
      toast,
    ]
  );

  const isSubmitting = saveVisit.isPending || completeVisit.isPending;
  const canFinish =
    !!appointment &&
    appointment.status !== 'completed' &&
    appointment.status !== 'cancelled';

  return {
    finishVisit,
    isSubmitting,
    emailState,
    hasCustomerEmail: !!appointment?.customer?.email,
    canFinish,
    requiredIncomplete,
  };
}
