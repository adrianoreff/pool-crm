import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type EmailPhotoRole = 'top_email' | 'extra_email';

export interface AppointmentPhotoRow {
  id: string;
  url: string;
  thumbnail_url: string | null;
  photo_role: string | null;
  is_primary: boolean | null;
}

export function useAppointmentEmailPhotos(appointmentId: string | undefined) {
  return useQuery({
    queryKey: ['appointment-email-photos', appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointment_photos')
        .select('id, url, thumbnail_url, photo_role, is_primary')
        .eq('appointment_id', appointmentId!)
        .in('photo_role', ['top_email', 'extra_email']);

      if (error) throw error;
      return (data || []) as AppointmentPhotoRow[];
    },
    enabled: !!appointmentId,
  });
}

export function getPhotoByRole(
  photos: AppointmentPhotoRow[],
  role: EmailPhotoRole
): AppointmentPhotoRow | undefined {
  return photos.find((p) => p.photo_role === role);
}
