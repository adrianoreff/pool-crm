import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppointmentWithRelations } from '@/types/database';
import { formatAppointmentDateLong } from '@/lib/utils';
import { formatTime } from '@/lib/utils';

/** Time overlap: A and B overlap if startA < endB AND endA > startB (times as "HH:MM") */
function timesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const toMinutes = (t: string) => {
    const [h, m] = t.slice(0, 5).split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  const sA = toMinutes(startA);
  const eA = toMinutes(endA);
  const sB = toMinutes(startB);
  const eB = toMinutes(endB);
  return sA < eB && eA > sB;
}

export interface TechnicianConflictResult {
  hasConflict: boolean;
  conflictAppointment: (AppointmentWithRelations & { conflictTimeLabel?: string }) | null;
}

/**
 * Check if a technician has another appointment at the same date/time.
 * Exclude an appointment id when editing (excludeAppointmentId).
 */
export async function checkTechnicianConflict(
  technicianId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeAppointmentId?: string
): Promise<TechnicianConflictResult> {
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      *,
      customer:customers(id, first_name, last_name),
      service:services(name),
      technician:users!appointments_technician_id_fkey(id, first_name, last_name)
    `)
    .eq('technician_id', technicianId)
    .eq('scheduled_date', date)
    .not('status', 'in', '("cancelled","no_show")')
    .order('scheduled_start_time', { ascending: true });

  if (error) {
    console.error('Technician conflict check error:', error);
    return { hasConflict: false, conflictAppointment: null };
  }

  const list = (appointments || []) as AppointmentWithRelations[];
  const filtered = excludeAppointmentId
    ? list.filter((a) => a.id !== excludeAppointmentId)
    : list;

  for (const apt of filtered) {
    if (timesOverlap(startTime, endTime, apt.scheduled_start_time, apt.scheduled_end_time)) {
      const conflictTimeLabel = `${formatAppointmentDateLong(apt.scheduled_date)} at ${formatTime(apt.scheduled_start_time)} - ${formatTime(apt.scheduled_end_time)}`;
      return {
        hasConflict: true,
        conflictAppointment: { ...apt, conflictTimeLabel },
      };
    }
  }

  return { hasConflict: false, conflictAppointment: null };
}

/**
 * Hook that returns a function to check technician conflict (e.g. before saving assignment).
 */
export function useCheckTechnicianConflict() {
  return useCallback(
    (
      technicianId: string,
      date: string,
      startTime: string,
      endTime: string,
      excludeAppointmentId?: string
    ) =>
      checkTechnicianConflict(
        technicianId,
        date,
        startTime,
        endTime,
        excludeAppointmentId
      ),
    []
  );
}
