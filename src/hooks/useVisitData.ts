import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useVisitReadings(appointmentId: string | undefined) {
  return useQuery({
    queryKey: ['visit-readings', appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visit_readings')
        .select('*, definition:pool_reading_definitions(*)')
        .eq('appointment_id', appointmentId!);
      if (error) throw error;
      return data;
    },
    enabled: !!appointmentId,
  });
}

export function useVisitDosages(appointmentId: string | undefined) {
  return useQuery({
    queryKey: ['visit-dosages', appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visit_dosages')
        .select('*, definition:pool_dosage_definitions(*)')
        .eq('appointment_id', appointmentId!);
      if (error) throw error;
      return data;
    },
    enabled: !!appointmentId,
  });
}

export function useVisitReport(appointmentId: string | undefined) {
  return useQuery({
    queryKey: ['visit-report', appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visit_reports')
        .select('*')
        .eq('appointment_id', appointmentId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!appointmentId,
  });
}

export function useCustomerVisitHistory(customerId: string | undefined, limit = 8) {
  return useQuery({
    queryKey: ['customer-visit-history', customerId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id, scheduled_date, status, completed_at,
          visit_readings(value_numeric, value_text, definition:pool_reading_definitions(label, key, unit)),
          visit_dosages(amount_display, amount_numeric, definition:pool_dosage_definitions(label, key, unit))
        `)
        .eq('customer_id', customerId!)
        .eq('status', 'completed')
        .order('scheduled_date', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });
}

const SERVICE_HISTORY_SELECT = `
  id, scheduled_date, status, completed_at, started_at,
  scheduled_start_time, scheduled_end_time, time_spent_minutes,
  technician:users!appointments_technician_id_fkey(id, first_name, last_name),
  visit_readings(value_numeric, value_text, definition:pool_reading_definitions(label, key, unit)),
  visit_dosages(amount_display, amount_numeric, definition:pool_dosage_definitions(label, key, unit)),
  visit_reports(email_subject, email_message, email_sent_at, email_status, internal_notes),
  appointment_photos(url, photo_role, is_primary),
  appointment_checklist_items(item_text, completed, completed_at)
`;

export type CustomerServiceHistoryVisit = {
  id: string;
  scheduled_date: string;
  status: string;
  completed_at: string | null;
  started_at: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  time_spent_minutes: number | null;
  technician: { id: string; first_name: string | null; last_name: string | null } | null;
  visit_readings: Array<{
    value_numeric: number | null;
    value_text: string | null;
    definition: { label: string; key: string; unit: string | null } | null;
  }>;
  visit_dosages: Array<{
    amount_display: string | null;
    amount_numeric: number | null;
    definition: { label: string; key: string; unit: string | null } | null;
  }>;
  visit_reports: Array<{
    email_subject: string | null;
    email_message: string | null;
    email_sent_at: string | null;
    email_status: string | null;
    internal_notes: string | null;
  }> | {
    email_subject: string | null;
    email_message: string | null;
    email_sent_at: string | null;
    email_status: string | null;
    internal_notes: string | null;
  } | null;
  appointment_photos: Array<{ url: string; photo_role: string | null; is_primary: boolean | null }>;
  appointment_checklist_items: Array<{
    item_text: string;
    completed: boolean | null;
    completed_at: string | null;
  }>;
};

export function useCustomerServiceHistory(customerId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ['customer-service-history', customerId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(SERVICE_HISTORY_SELECT)
        .eq('customer_id', customerId!)
        .eq('status', 'completed')
        .order('scheduled_date', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as CustomerServiceHistoryVisit[];
    },
    enabled: !!customerId,
  });
}

export function useSaveVisitData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      appointmentId: string;
      readings?: { definition_id: string; value_numeric?: number | null; value_text?: string | null }[];
      dosages?: { definition_id: string; amount_numeric?: number | null; amount_display?: string | null }[];
      internalNotes?: string;
      emailSubject?: string;
      emailMessage?: string;
    }) => {
      const { appointmentId, readings, dosages, internalNotes, emailSubject, emailMessage } =
        payload;

      if (readings !== undefined) {
        const keptIds = readings.map((r) => r.definition_id);

        if (keptIds.length > 0) {
          const { error } = await supabase.from('visit_readings').upsert(
            readings.map((r) => ({
              appointment_id: appointmentId,
              definition_id: r.definition_id,
              value_numeric: r.value_numeric ?? null,
              value_text: r.value_text ?? null,
            })),
            { onConflict: 'appointment_id,definition_id' }
          );
          if (error) throw error;

          const { error: deleteError } = await supabase
            .from('visit_readings')
            .delete()
            .eq('appointment_id', appointmentId)
            .not('definition_id', 'in', `(${keptIds.join(',')})`);
          if (deleteError) throw deleteError;
        } else {
          const { error } = await supabase
            .from('visit_readings')
            .delete()
            .eq('appointment_id', appointmentId);
          if (error) throw error;
        }
      }

      if (dosages !== undefined) {
        const keptIds = dosages.map((d) => d.definition_id);

        if (keptIds.length > 0) {
          const { error } = await supabase.from('visit_dosages').upsert(
            dosages.map((d) => ({
              appointment_id: appointmentId,
              definition_id: d.definition_id,
              amount_numeric: d.amount_numeric ?? null,
              amount_display: d.amount_display ?? null,
            })),
            { onConflict: 'appointment_id,definition_id' }
          );
          if (error) throw error;

          const { error: deleteError } = await supabase
            .from('visit_dosages')
            .delete()
            .eq('appointment_id', appointmentId)
            .not('definition_id', 'in', `(${keptIds.join(',')})`);
          if (deleteError) throw deleteError;
        } else {
          const { error } = await supabase
            .from('visit_dosages')
            .delete()
            .eq('appointment_id', appointmentId);
          if (error) throw error;
        }
      }

      if (
        internalNotes !== undefined ||
        emailSubject !== undefined ||
        emailMessage !== undefined
      ) {
        const reportPatch: Record<string, unknown> = { appointment_id: appointmentId };
        if (internalNotes !== undefined) reportPatch.internal_notes = internalNotes;
        if (emailSubject !== undefined) reportPatch.email_subject = emailSubject;
        if (emailMessage !== undefined) reportPatch.email_message = emailMessage;
        const { error } = await supabase
          .from('visit_reports')
          .upsert(reportPatch, { onConflict: 'appointment_id' });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['visit-readings', vars.appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['visit-dosages', vars.appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['visit-report', vars.appointmentId] });
    },
  });
}

export function useCompletePoolVisit() {
  const queryClient = useQueryClient();
  const { profile, business } = useAuth();

  return useMutation({
    mutationFn: async (payload: {
      appointmentId: string;
      customerEmail: string;
      customerName: string;
      photoUrl?: string;
      extraPhotoUrl?: string;
      readings: { label: string; value: string; unit?: string | null }[];
      dosages: { label: string; amount: string }[];
      emailSubject?: string;
      emailBody?: string;
      timeSpentMinutes?: number;
    }) => {
      const subject = payload.emailSubject || 'Your Pool Is Now Sparkling Clean!';
      const completedAt = new Date().toISOString();

      const { error: apptError } = await supabase
        .from('appointments')
        .update({
          status: 'completed',
          completed_at: completedAt,
          time_spent_minutes: payload.timeSpentMinutes ?? null,
          updated_at: completedAt,
        })
        .eq('id', payload.appointmentId);
      if (apptError) throw apptError;

      await supabase.from('visit_reports').upsert({
        appointment_id: payload.appointmentId,
        email_status: 'sent',
        email_sent_at: completedAt,
        email_subject: subject,
      }, { onConflict: 'appointment_id' });

      const { poolServiceReportEmail } = await import('@/lib/email-templates/pool-service-report');

      const html = poolServiceReportEmail({
        customerName: payload.customerName,
        businessName: business?.name || 'Pool CRM',
        businessPhone: business?.phone || '',
        photoUrl: payload.photoUrl,
        extraPhotoUrl: payload.extraPhotoUrl,
        readings: payload.readings,
        dosages: payload.dosages,
        subject,
        bodyMessage:
          payload.emailBody || 'Thanks for choosing us to keep your pool looking great!',
        emailHeader: subject.replace(/\s*-\s*[^-]+$/, '').trim() || subject,
      });

      const { error: emailError } = await supabase.functions.invoke('send-notification', {
        body: {
          type: 'custom_email',
          to: payload.customerEmail,
          toName: payload.customerName,
          subject: html.subject,
          html: html.html,
          businessId: profile?.business_id,
          emailType: 'pool_service_report',
          recipientType: 'customer',
          appointmentId: payload.appointmentId,
        },
      });
      if (emailError) throw emailError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['technician-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['visit-report'] });
    },
  });
}

export function useUnfinishVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'in_progress',
          completed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointmentId);
      if (error) throw error;
      await supabase.from('visit_reports').upsert({
        appointment_id: appointmentId,
        email_status: 'pending',
        email_sent_at: null,
      }, { onConflict: 'appointment_id' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['technician-appointments'] });
    },
  });
}
