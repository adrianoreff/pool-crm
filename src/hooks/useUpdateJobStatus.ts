import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { AppointmentStatus } from '@/types/database';

interface UpdateJobStatusParams {
  id: string;
  status: AppointmentStatus;
  sendNotification?: boolean;
  enRouteAt?: string;
  arrivedAt?: string;
  startedAt?: string;
}

export function useUpdateJobStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, status, sendNotification = true, enRouteAt, arrivedAt, startedAt }: UpdateJobStatusParams) => {
      // Get the current appointment data first for notifications
      const { data: appointment } = await supabase
        .from('appointments')
        .select(`
          *,
          customer:customers(id, first_name, last_name, email, phone),
          service:services(name)
        `)
        .eq('id', id)
        .single();

      // Build update data
      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };

      // Add timestamp fields based on status
      if (enRouteAt) {
        updateData.en_route_at = enRouteAt;
      }
      if (arrivedAt) {
        updateData.arrived_at = arrivedAt;
      }
      if (startedAt) {
        updateData.started_at = startedAt;
      }

      // Update the appointment
      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Send appropriate notification based on status change
      if (sendNotification && appointment) {
        try {
          // En route notification
          if (status === 'scheduled' && enRouteAt) {
            await supabase.functions.invoke('send-notification', {
              body: {
                type: 'custom_email',
                to: appointment.customer?.email,
                toName: `${appointment.customer?.first_name} ${appointment.customer?.last_name || ''}`.trim(),
                subject: `Technician On The Way - ${appointment.service?.name || 'Service'}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #F97316; color: white; padding: 20px; text-align: center;">
                      <h1 style="margin: 0;">🚗 Technician On The Way</h1>
                    </div>
                    <div style="padding: 20px; background: #fff;">
                      <p>Hi ${appointment.customer?.first_name},</p>
                      <p>Your technician is on the way to your location for your scheduled service.</p>
                      <p><strong>Service:</strong> ${appointment.service?.name || 'Service'}</p>
                      <p><strong>Date:</strong> ${appointment.scheduled_date}</p>
                      <p><strong>Time:</strong> ${appointment.scheduled_start_time}</p>
                      <p>We'll see you soon!</p>
                    </div>
                  </div>
                `,
                businessId: profile?.business_id,
                emailType: 'technician_en_route',
                recipientType: 'customer',
                appointmentId: id,
                customerId: appointment.customer?.id,
              },
            });
          }

          // Arrived notification
          if (arrivedAt) {
            await supabase.functions.invoke('send-notification', {
              body: {
                type: 'custom_email',
                to: appointment.customer?.email,
                toName: `${appointment.customer?.first_name} ${appointment.customer?.last_name || ''}`.trim(),
                subject: `Technician Arrived - ${appointment.service?.name || 'Service'}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #22C55E; color: white; padding: 20px; text-align: center;">
                      <h1 style="margin: 0;">✓ Technician Arrived</h1>
                    </div>
                    <div style="padding: 20px; background: #fff;">
                      <p>Hi ${appointment.customer?.first_name},</p>
                      <p>Your technician has arrived at your location and is ready to begin the service.</p>
                      <p><strong>Service:</strong> ${appointment.service?.name || 'Service'}</p>
                      <p>Thank you for your patience!</p>
                    </div>
                  </div>
                `,
                businessId: profile?.business_id,
                emailType: 'technician_arrived',
                recipientType: 'customer',
                appointmentId: id,
                customerId: appointment.customer?.id,
              },
            });
          }

          // Started notification (to admin)
          if (startedAt) {
            await supabase.functions.invoke('send-notification', {
              body: {
                type: 'custom_email',
                to: profile?.email || '',
                toName: 'Admin',
                subject: `Job Started - ${appointment.ref_code || id}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #3B82F6; color: white; padding: 20px; text-align: center;">
                      <h1 style="margin: 0;">Job Started</h1>
                    </div>
                    <div style="padding: 20px; background: #fff;">
                      <p><strong>Customer:</strong> ${appointment.customer?.first_name} ${appointment.customer?.last_name || ''}</p>
                      <p><strong>Service:</strong> ${appointment.service?.name || 'Service'}</p>
                      <p><strong>Reference:</strong> ${appointment.ref_code || 'N/A'}</p>
                      <p>The technician has started the job.</p>
                    </div>
                  </div>
                `,
                businessId: profile?.business_id,
                emailType: 'technician_started',
                recipientType: 'admin',
                appointmentId: id,
              },
            });
          }
        } catch (emailError) {
          console.error('Failed to send status notification:', emailError);
          // Don't throw - notification failure shouldn't block status update
        }
      }

      return { id, status };
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['technician-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      const statusLabels: Record<string, string> = {
        scheduled: 'Status updated',
        in_progress: 'Job started',
      };
      toast({ title: statusLabels[status] || 'Status updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update status', description: error.message, variant: 'destructive' });
    },
  });
}
