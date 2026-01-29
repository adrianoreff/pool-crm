import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  EmailTemplate, 
  EmailTemplateInsert, 
  EmailTemplateUpdate,
  EmailTemplateCategory 
} from '@/types/database';

// Default templates for businesses without custom templates
const DEFAULT_TEMPLATES: Omit<EmailTemplate, 'id' | 'business_id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Booking Request Received',
    slug: 'appointment_request_received',
    description: 'Sent when a new booking request is received',
    category: 'customer',
    trigger_event: 'appointment_request_received',
    recipient_type: 'customer',
    subject: 'We Received Your Service Request - {{business_name}}',
    body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #F97316; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin:0;">Request Received 📋</h1>
      </div>
      <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5;">
        <p>Hi {{customer_name}},</p>
        <p>Thanks for contacting <strong>{{business_name}}</strong>. We received your request and we are reviewing it now.</p>
        <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p><strong>Service:</strong> {{service_name}}</p>
          <p><strong>Preferred Date:</strong> {{appointment_date}} ({{appointment_time}})</p>
          <p><strong>Reference:</strong> {{appointment_id}}</p>
        </div>
        <p>During business hours, this usually takes just a few minutes.</p>
        <p>Questions? Call us at <strong>{{business_phone}}</strong>.</p>
      </div>
      <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px;">
        <p>{{business_name}} | {{business_phone}}</p>
      </div>
    </div>`,
    body_text: null,
    is_active: true,
    is_default: true,
  },
  {
    name: 'Appointment Confirmed',
    slug: 'appointment_confirmation',
    description: 'Sent when an appointment is confirmed by admin',
    category: 'customer',
    trigger_event: 'appointment_confirmation',
    recipient_type: 'customer',
    subject: '✅ Appointment Confirmed - {{appointment_date}} - {{business_name}}',
    body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #16A34A; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin:0;">Appointment Confirmed! ✓</h1>
      </div>
      <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5;">
        <p>Hi {{customer_name}},</p>
        <p>Great news! Your appointment has been confirmed.</p>
        <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p><strong>📅 Date:</strong> {{appointment_date}}</p>
          <p><strong>🕐 Time:</strong> {{appointment_time}}</p>
          <p><strong>🔧 Service:</strong> {{service_name}}</p>
          <p><strong>📍 Address:</strong> {{customer_address}}</p>
          <p><strong>🏷️ Reference:</strong> {{appointment_id}}</p>
        </div>
        <p>Questions? Call us at <strong>{{business_phone}}</strong></p>
      </div>
      <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px;">
        <p>{{business_name}} | {{business_phone}}</p>
      </div>
    </div>`,
    body_text: null,
    is_active: true,
    is_default: true,
  },
  {
    name: 'Appointment Rescheduled',
    slug: 'appointment_rescheduled',
    description: 'Sent when appointment date/time is changed',
    category: 'customer',
    trigger_event: 'appointment_rescheduled',
    recipient_type: 'customer',
    subject: '📅 Appointment Rescheduled - {{appointment_date}} - {{business_name}}',
    body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2563EB; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin:0;">📅 Appointment Rescheduled</h1>
      </div>
      <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5;">
        <p>Hi {{customer_name}},</p>
        <p>Your appointment has been rescheduled. Here are the new details:</p>
        <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p><strong>📅 New Date:</strong> {{appointment_date}}</p>
          <p><strong>🕐 New Time:</strong> {{appointment_time}}</p>
          <p><strong>🔧 Service:</strong> {{service_name}}</p>
          <p><strong>📍 Address:</strong> {{customer_address}}</p>
        </div>
        <p>If this doesn't work, please call us at <strong>{{business_phone}}</strong>.</p>
      </div>
      <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px;">
        <p>{{business_name}} | {{business_phone}}</p>
      </div>
    </div>`,
    body_text: null,
    is_active: true,
    is_default: true,
  },
  {
    name: 'Appointment Cancelled',
    slug: 'appointment_cancelled',
    description: 'Sent when an appointment is cancelled',
    category: 'customer',
    trigger_event: 'appointment_cancelled',
    recipient_type: 'customer',
    subject: 'Appointment Cancelled - {{appointment_id}} - {{business_name}}',
    body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #6B7280; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin:0;">Appointment Cancelled</h1>
      </div>
      <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5;">
        <p>Hi {{customer_name}},</p>
        <p>Your appointment has been cancelled.</p>
        <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Service:</strong> {{service_name}}</p>
          <p><strong>Reference:</strong> {{appointment_id}}</p>
        </div>
        <p>We'd love to help you in the future! Call us at <strong>{{business_phone}}</strong> to reschedule.</p>
      </div>
      <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px;">
        <p>{{business_name}} | {{business_phone}}</p>
      </div>
    </div>`,
    body_text: null,
    is_active: true,
    is_default: true,
  },
  {
    name: 'Appointment Reminder',
    slug: 'appointment_reminder',
    description: 'Sent 24 hours before the appointment',
    category: 'customer',
    trigger_event: 'appointment_reminder',
    recipient_type: 'customer',
    subject: '📅 Reminder: Your Appointment Tomorrow - {{business_name}}',
    body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #F97316; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin:0;">📅 Appointment Reminder</h1>
      </div>
      <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5;">
        <p>Hi {{customer_name}},</p>
        <p>This is a friendly reminder about your upcoming appointment:</p>
        <div style="background: #FFF7ED; border: 1px solid #FDBA74; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
          <div style="font-size: 28px; font-weight: bold; color: #F97316;">{{appointment_date}}</div>
          <div style="font-size: 20px; color: #666;">{{appointment_time}}</div>
          <hr style="margin: 15px 0; border: none; border-top: 1px solid #FDBA74;">
          <p><strong>Service:</strong> {{service_name}}</p>
          <p><strong>Address:</strong> {{customer_address}}</p>
        </div>
        <p>Need to reschedule? Call us at <strong>{{business_phone}}</strong>.</p>
      </div>
      <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px;">
        <p>{{business_name}} | {{business_phone}}</p>
      </div>
    </div>`,
    body_text: null,
    is_active: true,
    is_default: true,
  },
  {
    name: 'Service Completed',
    slug: 'appointment_completed',
    description: 'Sent when the service is marked as completed',
    category: 'customer',
    trigger_event: 'appointment_completed',
    recipient_type: 'customer',
    subject: '✓ Service Completed - Thank You! - {{business_name}}',
    body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #16A34A; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin:0;">✓ Service Completed</h1>
      </div>
      <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5;">
        <p>Hi {{customer_name}},</p>
        <p>Thank you for choosing us! Your service has been completed.</p>
        <p>If you have any questions or need further assistance, please don't hesitate to contact us.</p>
        <p>We'd love to hear your feedback!</p>
        <p>Best regards,<br>{{business_name}}</p>
      </div>
      <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px;">
        <p>{{business_name}} | {{business_phone}}</p>
      </div>
    </div>`,
    body_text: null,
    is_active: true,
    is_default: true,
  },
  {
    name: 'New Booking Alert',
    slug: 'admin_new_appointment',
    description: 'Sent to admin when a new booking is received',
    category: 'admin',
    trigger_event: 'admin_new_appointment',
    recipient_type: 'admin',
    subject: '📬 New Appointment Request - {{appointment_id}} - {{business_name}}',
    body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #F97316; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin:0;">📬 New Appointment</h1>
      </div>
      <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5;">
        <p><strong>Customer:</strong> {{customer_name}}</p>
        <p><strong>Phone:</strong> {{customer_phone}}</p>
        <p><strong>Email:</strong> {{customer_email}}</p>
        <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p><strong>Reference:</strong> {{appointment_id}}</p>
          <p><strong>Date:</strong> {{appointment_date}}</p>
          <p><strong>Time:</strong> {{appointment_time}}</p>
          <p><strong>Service:</strong> {{service_name}}</p>
          <p><strong>Address:</strong> {{customer_address}}</p>
        </div>
        <p>Open the dashboard to confirm and assign a technician.</p>
      </div>
      <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px;">
        <p>{{business_name}} | {{business_phone}}</p>
      </div>
    </div>`,
    body_text: null,
    is_active: true,
    is_default: true,
  },
  {
    name: 'Confirmation Recorded',
    slug: 'admin_confirmation_recorded',
    description: 'Sent to admin when they confirm an appointment',
    category: 'admin',
    trigger_event: 'admin_confirmation_recorded',
    recipient_type: 'admin',
    subject: '✅ Appointment Confirmed - {{customer_name}} on {{appointment_date}}',
    body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #16A34A; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin:0;">Appointment Confirmed</h1>
      </div>
      <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5;">
        <p>You have confirmed the following appointment:</p>
        <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p><strong>Customer:</strong> {{customer_name}}</p>
          <p><strong>Service:</strong> {{service_name}}</p>
          <p><strong>Date:</strong> {{appointment_date}} at {{appointment_time}}</p>
          <p><strong>Address:</strong> {{customer_address}}</p>
        </div>
        <p>This is a confirmation for your records.</p>
      </div>
      <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px;">
        <p>{{business_name}} | {{business_phone}}</p>
      </div>
    </div>`,
    body_text: null,
    is_active: true,
    is_default: true,
  },
  {
    name: 'New Job Assigned',
    slug: 'technician_assigned',
    description: 'Sent to technician when assigned to a job',
    category: 'technician',
    trigger_event: 'technician_assigned',
    recipient_type: 'technician',
    subject: '🔧 New Job Assigned - {{customer_name}} on {{appointment_date}}',
    body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #F97316; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin:0;">New Job Assigned</h1>
      </div>
      <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5;">
        <p>A new job has been assigned to you:</p>
        <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p><strong>Customer:</strong> {{customer_name}}</p>
          <p><strong>Service:</strong> {{service_name}}</p>
          <p><strong>Date:</strong> {{appointment_date}} at {{appointment_time}}</p>
          <p><strong>Address:</strong> {{customer_address}}</p>
        </div>
        <p>Log in to the technician portal to view job details.</p>
      </div>
      <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px;">
        <p>{{business_name}} | {{business_phone}}</p>
      </div>
    </div>`,
    body_text: null,
    is_active: true,
    is_default: true,
  },
];

// Sample data for preview
export const SAMPLE_TEMPLATE_DATA = {
  customer_name: 'John Smith',
  customer_first_name: 'John',
  customer_email: 'john@example.com',
  customer_phone: '(555) 123-4567',
  customer_address: '123 Main St, San Diego, CA 92101',
  appointment_id: 'BRO-00001',
  appointment_date: 'Monday, January 29, 2026',
  appointment_time: '10:00 AM - 12:00 PM',
  appointment_date_short: '01/29/2026',
  service_name: 'Plumbing - Leak Repair',
  appointment_notes: 'Leaking faucet in kitchen',
  old_date: 'Friday, January 24, 2026',
  old_time: '2:00 PM',
  new_date: 'Monday, January 29, 2026',
  new_time: '10:00 AM',
  technician_name: 'Mike Johnson',
  technician_phone: '(555) 987-6543',
  business_name: 'Bros Plumbers',
  business_phone: '(555) 000-0000',
  business_email: 'info@brosplumbers.com',
  business_address: '456 Business Ave, San Diego, CA',
  business_logo_url: '/logo.png',
};

// Available variables for templates
export const TEMPLATE_VARIABLES = {
  customer: [
    { key: 'customer_name', label: 'Customer Full Name', description: 'First and last name' },
    { key: 'customer_first_name', label: 'Customer First Name', description: 'First name only' },
    { key: 'customer_email', label: 'Customer Email', description: 'Email address' },
    { key: 'customer_phone', label: 'Customer Phone', description: 'Phone number' },
    { key: 'customer_address', label: 'Customer Address', description: 'Service address' },
  ],
  appointment: [
    { key: 'appointment_id', label: 'Reference Number', description: 'e.g., BRO-00001' },
    { key: 'appointment_date', label: 'Appointment Date', description: 'Formatted date' },
    { key: 'appointment_time', label: 'Appointment Time', description: 'Time window' },
    { key: 'appointment_date_short', label: 'Short Date', description: 'MM/DD/YYYY format' },
    { key: 'service_name', label: 'Service Name', description: 'Service type' },
    { key: 'appointment_notes', label: 'Customer Notes', description: 'Notes from customer' },
  ],
  reschedule: [
    { key: 'old_date', label: 'Previous Date', description: 'Original date' },
    { key: 'old_time', label: 'Previous Time', description: 'Original time' },
    { key: 'new_date', label: 'New Date', description: 'Updated date' },
    { key: 'new_time', label: 'New Time', description: 'Updated time' },
  ],
  technician: [
    { key: 'technician_name', label: 'Technician Name', description: 'Assigned technician' },
    { key: 'technician_phone', label: 'Technician Phone', description: 'Technician phone' },
  ],
  business: [
    { key: 'business_name', label: 'Business Name', description: 'Company name' },
    { key: 'business_phone', label: 'Business Phone', description: 'Company phone' },
    { key: 'business_email', label: 'Business Email', description: 'Company email' },
    { key: 'business_address', label: 'Business Address', description: 'Company address' },
    { key: 'business_logo_url', label: 'Logo URL', description: 'Company logo URL' },
  ],
};

// Replace variables in template content
export function replaceVariables(content: string, data: Record<string, string>): string {
  let result = content;
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  });
  // Remove any remaining {{#if ...}}...{{/if}} blocks for preview
  result = result.replace(/{{#if\s+\w+}}[\s\S]*?{{\/if}}/g, '');
  return result;
}

export function useEmailTemplates() {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['email-templates', businessId],
    queryFn: async (): Promise<EmailTemplate[]> => {
      if (!businessId) return [];

      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('business_id', businessId)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching email templates:', error);
        // Return default templates if table doesn't exist yet
        return DEFAULT_TEMPLATES.map((t, i) => ({
          ...t,
          id: `default-${i}`,
          business_id: businessId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
      }

      const dbTemplates = (data || []) as EmailTemplate[];
      const slugsInDb = new Set(dbTemplates.map((t) => t.slug));

      // Merge: default templates (for slugs not in DB) + all templates from DB
      const defaultMerged: EmailTemplate[] = DEFAULT_TEMPLATES.filter(
        (t) => !slugsInDb.has(t.slug)
      ).map((t, i) => ({
        ...t,
        id: `default-${t.slug}`,
        business_id: businessId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const merged = [...defaultMerged, ...dbTemplates].sort((a, b) => {
        const catOrder = { customer: 0, admin: 1, technician: 2, custom: 3 };
        const catDiff = (catOrder[a.category] ?? 3) - (catOrder[b.category] ?? 3);
        if (catDiff !== 0) return catDiff;
        return a.name.localeCompare(b.name);
      });

      return merged;
    },
    enabled: !!businessId,
  });
}

export function useEmailTemplate(id: string) {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['email-template', id],
    queryFn: async (): Promise<EmailTemplate | null> => {
      if (!businessId || !id) return null;

      // Handle default templates (id format: default-<slug>)
      if (id.startsWith('default-')) {
        const slug = id.replace('default-', '');
        const template = DEFAULT_TEMPLATES.find((t) => t.slug === slug);
        if (template) {
          return {
            ...template,
            id,
            business_id: businessId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
        return null;
      }

      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', id)
        .eq('business_id', businessId)
        .single();

      if (error) {
        console.error('Error fetching email template:', error);
        return null;
      }

      return data as EmailTemplate;
    },
    enabled: !!businessId && !!id,
  });
}

export function useCreateEmailTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (template: Omit<EmailTemplateInsert, 'business_id'>) => {
      if (!profile?.business_id) throw new Error('No business ID');

      const { data, error } = await supabase
        .from('email_templates')
        .insert({
          ...template,
          business_id: profile.business_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast({ title: 'Template created successfully' });
    },
    onError: (error) => {
      console.error('Failed to create template:', error);
      toast({ 
        title: 'Failed to create template', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: EmailTemplateUpdate & { id: string }) => {
      if (!profile?.business_id) throw new Error('No business ID');

      // Handle "default-" templates - create a new one (id format: default-<slug>)
      if (id.startsWith('default-')) {
        const slug = id.replace('default-', '');
        const defaultTemplate = DEFAULT_TEMPLATES.find((t) => t.slug === slug);
        if (!defaultTemplate) throw new Error('Template not found');

        const { data, error } = await supabase
          .from('email_templates')
          .insert({
            ...defaultTemplate,
            ...updates,
            business_id: profile.business_id,
            is_default: true,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from('email_templates')
        .update(updates)
        .eq('id', id)
        .eq('business_id', profile.business_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast({ title: 'Template updated successfully' });
    },
    onError: (error) => {
      console.error('Failed to update template:', error);
      toast({ 
        title: 'Failed to update template', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!profile?.business_id) throw new Error('No business ID');

      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id)
        .eq('business_id', profile.business_id)
        .eq('is_default', false); // Only delete non-default templates

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast({ title: 'Template deleted successfully' });
    },
    onError: (error) => {
      console.error('Failed to delete template:', error);
      toast({ 
        title: 'Failed to delete template', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useSendTestEmail() {
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      to, 
      subject, 
      html 
    }: { 
      to: string; 
      subject: string; 
      html: string;
    }) => {
      if (!profile?.business_id) throw new Error('No business ID');

      const { error } = await supabase.functions.invoke('send-notification', {
        body: {
          type: 'custom_email',
          to,
          toName: 'Test Recipient',
          subject: `[TEST] ${subject}`,
          html,
          businessId: profile.business_id,
          emailType: 'test_email',
          recipientType: 'admin',
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Test email sent successfully' });
    },
    onError: (error) => {
      console.error('Failed to send test email:', error);
      toast({ 
        title: 'Failed to send test email', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}
