import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AppointmentWithRelations } from '@/types/database';

interface RescheduleParams {
  appointment: AppointmentWithRelations;
  newDate: string;
  newStartTime: string;
  newEndTime: string;
}

export function useRescheduleAppointment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ appointment, newDate, newStartTime, newEndTime }: RescheduleParams) => {
      const oldDate = appointment.scheduled_date;
      const oldStartTime = appointment.scheduled_start_time;
      const oldEndTime = appointment.scheduled_end_time;
      
      // Update the appointment
      const { error } = await supabase
        .from('appointments')
        .update({
          scheduled_date: newDate,
          scheduled_start_time: newStartTime,
          scheduled_end_time: newEndTime,
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointment.id);

      if (error) throw error;

      // Send reschedule email to customer via edge function
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'appointment_rescheduled',
            appointmentId: appointment.id,
          },
        });
        console.log('Reschedule email sent to customer');
      } catch (emailError) {
        console.error('Failed to send reschedule email:', emailError);
      }

      // Send admin notification for reschedule
      try {
        const adminEmails: { email: string; name: string }[] = [];
        
        // Get configured notification recipients
        const { data: recipients } = await supabase
          .from('notification_recipients')
          .select('email, name')
          .eq('business_id', profile?.business_id)
          .eq('is_active', true);

        if (recipients && recipients.length > 0) {
          adminEmails.push(...recipients.map(r => ({ email: r.email, name: r.name || 'Admin' })));
        }
        
        // Also get business email as fallback
        const { data: business } = await supabase
          .from('businesses')
          .select('email, name')
          .eq('id', profile?.business_id)
          .single();
        
        if (business?.email && !adminEmails.some(a => a.email === business.email)) {
          adminEmails.push({ email: business.email, name: business.name || 'Admin' });
        }
        
        // Send to all admin emails
        for (const admin of adminEmails) {
          await supabase.functions.invoke('send-notification', {
            body: {
              type: 'custom_email',
              to: admin.email,
              toName: admin.name,
              subject: `Appointment Rescheduled - ${appointment.ref_code || appointment.id}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: #2563EB; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0;">📅 Appointment Rescheduled</h1>
                  </div>
                  <div style="padding: 20px; background: #fff;">
                    <p><strong>Customer:</strong> ${appointment.customer?.first_name} ${appointment.customer?.last_name || ''}</p>
                    <p><strong>Reference:</strong> ${appointment.ref_code || 'N/A'}</p>
                    <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 15px 0;">
                      <p style="margin: 0;"><strong>Old Date:</strong> ${oldDate}</p>
                      <p style="margin: 0;"><strong>Old Time:</strong> ${oldStartTime} - ${oldEndTime}</p>
                    </div>
                    <div style="background: #D1FAE5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                      <p style="margin: 0;"><strong>New Date:</strong> ${newDate}</p>
                      <p style="margin: 0;"><strong>New Time:</strong> ${newStartTime} - ${newEndTime}</p>
                    </div>
                  </div>
                </div>
              `,
              businessId: profile?.business_id,
              emailType: 'admin_appointment_rescheduled',
              recipientType: 'admin',
              appointmentId: appointment.id,
            },
          });
        }
        console.log(`Reschedule notifications sent to ${adminEmails.length} admins`);
      } catch (adminError) {
        console.error('Failed to send admin reschedule notification:', adminError);
      }

      return { oldDate, oldStartTime, oldEndTime, newDate, newStartTime, newEndTime };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: 'Appointment rescheduled',
        description: `Moved to ${variables.newDate} at ${variables.newStartTime}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to reschedule',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
