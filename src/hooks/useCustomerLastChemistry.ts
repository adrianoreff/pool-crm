import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatLastReadingLabel } from '@/lib/pool-reading-presets';

export interface LastChemistryValue {
  date: string;
  value: string;
  label: string;
}

export function useCustomerLastChemistry(
  customerId: string | undefined,
  excludeAppointmentId: string | undefined
) {
  return useQuery({
    queryKey: ['customer-last-chemistry', customerId, excludeAppointmentId],
    queryFn: async () => {
      const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select('id, scheduled_date')
        .eq('customer_id', customerId!)
        .eq('status', 'completed')
        .neq('id', excludeAppointmentId!)
        .order('scheduled_date', { ascending: false })
        .limit(1);

      if (apptError) throw apptError;
      const lastAppt = appointments?.[0];
      if (!lastAppt) {
        return { readingLast: {} as Record<string, LastChemistryValue>, dosageLast: {} as Record<string, LastChemistryValue> };
      }

      const { data: readings, error: rErr } = await supabase
        .from('visit_readings')
        .select('definition_id, value_numeric, value_text, definition:pool_reading_definitions(label, unit)')
        .eq('appointment_id', lastAppt.id);

      if (rErr) throw rErr;

      const { data: dosages, error: dErr } = await supabase
        .from('visit_dosages')
        .select('definition_id, amount_display, definition:pool_dosage_definitions(label, unit)')
        .eq('appointment_id', lastAppt.id);

      if (dErr) throw dErr;

      const readingLast: Record<string, LastChemistryValue> = {};
      for (const row of readings || []) {
        const def = row.definition as { label: string; unit: string | null } | null;
        const val = row.value_text ?? (row.value_numeric != null ? String(row.value_numeric) : '');
        if (!val || !row.definition_id) continue;
        readingLast[row.definition_id] = {
          date: lastAppt.scheduled_date,
          value: val,
          label: formatLastReadingLabel(lastAppt.scheduled_date, val, def?.unit),
        };
      }

      const dosageLast: Record<string, LastChemistryValue> = {};
      for (const row of dosages || []) {
        const def = row.definition as { label: string; unit: string | null } | null;
        const val = row.amount_display || '';
        if (!val || !row.definition_id) continue;
        dosageLast[row.definition_id] = {
          date: lastAppt.scheduled_date,
          value: val,
          label: formatLastReadingLabel(lastAppt.scheduled_date, val, def?.unit),
        };
      }

      return { readingLast, dosageLast };
    },
    enabled: !!customerId && !!excludeAppointmentId,
  });
}
