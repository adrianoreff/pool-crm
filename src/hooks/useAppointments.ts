import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppointmentWithRelations, AppointmentFilters, AppointmentStatus } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { getLocalDateString } from '@/lib/utils';

export function useAppointments(filters?: AppointmentFilters) {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['appointments', businessId, filters],
    queryFn: async () => {
      if (!businessId) return [];

      let query = supabase
        .from('appointments')
        .select(`
          *,
          customer:customers(*),
          service:services(*),
          technician:users!appointments_technician_id_fkey(id, first_name, last_name, avatar_url, color)
        `)
        .eq('business_id', businessId)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_start_time', { ascending: true });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.dateFrom) {
        query = query.gte('scheduled_date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('scheduled_date', filters.dateTo);
      }
      if (filters?.technicianId) {
        query = query.eq('technician_id', filters.technicianId);
      }
      if (filters?.serviceId) {
        query = query.eq('service_id', filters.serviceId);
      }
      if (filters?.source) {
        query = query.eq('source', filters.source);
      }
      if (filters?.hasProblemReported) {
        query = query
          .not('status', 'in', '(cancelled,completed)')
          .ilike('technician_notes', '%[Problem reported]%');
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AppointmentWithRelations[];
    },
    enabled: !!businessId,
  });
}

export function useTodayAppointments() {
  const today = getLocalDateString();
  return useAppointments({ dateFrom: today, dateTo: today });
}

export function usePendingAppointments() {
  return useAppointments({ status: 'pending_confirmation' });
}

export function useAppointment(id: string) {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['appointment', id],
    queryFn: async () => {
      if (!id) {
        console.error('useAppointment: No ID provided');
        throw new Error('Appointment ID is required');
      }

      console.log('Fetching appointment:', { id, businessId, profileId: profile?.id });

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          customer:customers(*),
          service:services(*),
          technician:users!appointments_technician_id_fkey(id, first_name, last_name, avatar_url, color)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching appointment:', error);
        throw error;
      }

      console.log('Appointment fetched:', {
        id: data?.id,
        hasCustomer: !!data?.customer,
        hasService: !!data?.service,
        customerName: data?.customer ? `${data.customer.first_name} ${data.customer.last_name}` : 'No customer',
        address: data?.address,
      });

      return data as AppointmentWithRelations;
    },
    enabled: !!businessId && !!id,
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, status, sendNotification = true }: { id: string; status: AppointmentStatus; sendNotification?: boolean }) => {
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

      // Update the status
      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };

      // Add confirmation data if confirming
      if (status === 'scheduled' && appointment?.status === 'pending_confirmation') {
        updateData.confirmed_at = new Date().toISOString();
        updateData.confirmed_by = profile?.id;
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Send appropriate notification based on status change
      if (sendNotification && appointment) {
        try {
          // Customer confirmation email
          if (status === 'scheduled' && appointment.status === 'pending_confirmation') {
            await supabase.functions.invoke('send-notification', {
              body: { type: 'appointment_confirmation', appointmentId: id },
            });
            console.log('Confirmation email sent to customer');

            // Admin confirmation recorded (for records)
            await supabase.functions.invoke('send-notification', {
              body: { type: 'admin_confirmation_recorded', appointmentId: id },
            });
            console.log('Confirmation recorded email sent to admin');
          }

          // Completed email
          if (status === 'completed') {
            await supabase.functions.invoke('send-notification', {
              body: {
                type: 'custom_email',
                to: appointment.customer?.email,
                toName: `${appointment.customer?.first_name} ${appointment.customer?.last_name || ''}`.trim(),
                subject: `Service Completed - Thank You!`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #16A34A; color: white; padding: 20px; text-align: center;">
                      <h1 style="margin: 0;">✓ Service Completed</h1>
                    </div>
                    <div style="padding: 20px; background: #fff;">
                      <p>Hi ${appointment.customer?.first_name},</p>
                      <p>Thank you for choosing us! Your service has been completed.</p>
                      <p>If you have any questions or need further assistance, please don't hesitate to contact us.</p>
                      <p>We'd love to hear your feedback!</p>
                    </div>
                  </div>
                `,
                businessId: profile?.business_id,
                emailType: 'appointment_completed',
                recipientType: 'customer',
                appointmentId: id,
                customerId: appointment.customer?.id,
              },
            });
            console.log('Completion email sent to customer');
          }

          // No-show notification
          if (status === 'no_show') {
            await supabase.functions.invoke('send-notification', {
              body: {
                type: 'custom_email',
                to: appointment.customer?.email,
                toName: `${appointment.customer?.first_name} ${appointment.customer?.last_name || ''}`.trim(),
                subject: `Missed Appointment - Let's Reschedule`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #6B7280; color: white; padding: 20px; text-align: center;">
                      <h1 style="margin: 0;">Missed Appointment</h1>
                    </div>
                    <div style="padding: 20px; background: #fff;">
                      <p>Hi ${appointment.customer?.first_name},</p>
                      <p>We're sorry we missed you for your scheduled appointment on ${appointment.scheduled_date}.</p>
                      <p>Please contact us to reschedule at your earliest convenience.</p>
                    </div>
                  </div>
                `,
                businessId: profile?.business_id,
                emailType: 'appointment_no_show',
                recipientType: 'customer',
                appointmentId: id,
                customerId: appointment.customer?.id,
              },
            });
            console.log('No-show email sent to customer');
          }
        } catch (emailError) {
          console.error('Failed to send status notification:', emailError);
        }
      }

      return { id, status };
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      const statusLabels: Record<string, string> = {
        scheduled: 'Appointment confirmed',
        in_progress: 'Appointment in progress',
        completed: 'Appointment completed',
        no_show: 'Marked as no-show',
      };
      toast({ title: statusLabels[status] || 'Status updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update status', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      // Get appointment data first for notifications
      const { data: appointment } = await supabase
        .from('appointments')
        .select(`
          *,
          customer:customers(id, first_name, last_name, email, phone),
          service:services(name),
          business:businesses(id, name, phone, email)
        `)
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled' as AppointmentStatus, 
          cancelled_at: new Date().toISOString(),
          cancelled_by: profile?.id,
          cancellation_reason: reason,
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) throw error;

      // Send cancellation emails
      if (appointment) {
        try {
          // Customer cancellation email
          await supabase.functions.invoke('send-notification', {
            body: { type: 'appointment_cancelled', appointmentId: id },
          });
          console.log('Cancellation email sent to customer');

          // Admin cancellation notification - send to notification_recipients AND business email
          const adminEmails: { email: string; name: string }[] = [];
          
          // Get configured notification recipients
          const { data: recipients } = await supabase
            .from('notification_recipients')
            .select('email, name')
            .eq('business_id', profile?.business_id)
            .eq('is_active', true)
            .eq('notify_cancellation', true);
          
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
                subject: `Appointment Cancelled - ${appointment.ref_code || id}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #DC2626; color: white; padding: 20px; text-align: center;">
                      <h1 style="margin: 0;">❌ Appointment Cancelled</h1>
                    </div>
                    <div style="padding: 20px; background: #fff;">
                      <p><strong>Customer:</strong> ${appointment.customer?.first_name} ${appointment.customer?.last_name || ''}</p>
                      <p><strong>Phone:</strong> ${appointment.customer?.phone || 'N/A'}</p>
                      <p><strong>Reference:</strong> ${appointment.ref_code || 'N/A'}</p>
                      <p><strong>Service:</strong> ${appointment.service?.name || 'N/A'}</p>
                      <p><strong>Date:</strong> ${appointment.scheduled_date}</p>
                      <p><strong>Time:</strong> ${appointment.scheduled_start_time} - ${appointment.scheduled_end_time}</p>
                      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
                    </div>
                  </div>
                `,
                businessId: profile?.business_id,
                emailType: 'admin_appointment_cancelled',
                recipientType: 'admin',
                appointmentId: id,
              },
            });
          }
          console.log(`Cancellation notifications sent to ${adminEmails.length} admins`);

          // Push notifications: admins and assigned technician
          try {
            const emails = adminEmails.map((a) => a.email);
            const { data: adminUsers } = await supabase
              .from('users')
              .select('id')
              .eq('business_id', profile?.business_id)
              .in('email', emails);
            const adminUserIds = (adminUsers || []).map((u) => u.id);
            const customerName = appointment.customer ? `${appointment.customer.first_name} ${appointment.customer.last_name || ''}`.trim() : 'Customer';
            const payload = {
              title: 'Appointment cancelled',
              body: `${appointment.ref_code || id} – ${customerName}`,
              url: '/appointments',
            };
            for (const userId of adminUserIds) {
              await supabase.functions.invoke('send-push-notification', {
                body: { user_id: userId, business_id: profile?.business_id, notification_type: 'cancellation', payload },
              });
            }
            if (appointment.technician_id && profile?.business_id) {
              await supabase.functions.invoke('send-push-notification', {
                body: { user_id: appointment.technician_id, business_id: profile.business_id, notification_type: 'cancellation', payload },
              });
            }
          } catch (pushErr) {
            console.error('Failed to send cancellation push:', pushErr);
          }
        } catch (emailError) {
          console.error('Failed to send cancellation emails:', emailError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({ title: 'Appointment cancelled' });
    },
    onError: (error) => {
      toast({ title: 'Failed to cancel appointment', description: error.message, variant: 'destructive' });
    },
  });
}
