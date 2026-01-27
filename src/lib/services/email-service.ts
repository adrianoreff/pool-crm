import { supabase } from '@/integrations/supabase/client';
import {
  appointmentRequestReceivedEmail,
  appointmentConfirmedEmail,
  appointmentReminderEmail,
  appointmentRescheduledEmail,
  appointmentCancelledEmail,
  appointmentCompletedEmail,
  technicianEnRouteEmail,
  techNewAssignmentEmail,
  adminNewAppointmentEmail,
  invoiceSentEmail,
  followUpEmail,
  techAssignmentChangedEmail,
  techAssignmentCancelledEmail,
  techDailyScheduleEmail,
  adminAppointmentCancelledEmail,
  adminDailySummaryEmail,
  adminWeeklyReportEmail,
} from '@/lib/email-templates';

export type RecipientType = 'customer' | 'technician' | 'admin';

interface SendEmailParams {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  businessId: string;
  emailType: string;
  recipientType: RecipientType;
  appointmentId?: string;
  customerId?: string;
  userId?: string;
}

interface EmailResult {
  success: boolean;
  id?: string;
  error?: unknown;
}

async function sendEmail(params: SendEmailParams): Promise<EmailResult> {
  const { 
    to, 
    toName, 
    subject, 
    html, 
    businessId, 
    emailType, 
    recipientType, 
    appointmentId, 
    customerId, 
    userId 
  } = params;

  try {
    // Call Supabase Edge Function to send email via Resend
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        type: 'custom_email',
        to,
        toName,
        subject,
        html,
        businessId,
        emailType,
        recipientType,
        appointmentId,
        customerId,
        userId,
      },
    });

    if (error) throw error;

    return { success: true, id: data?.emailId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}

// Format helpers
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':');
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatTimeWindow(startTime: string, endTime: string): string {
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

// Appointment data interface
interface AppointmentData {
  id: string;
  ref_code?: string;
  scheduled_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  address: string;
  customer_notes?: string;
  source?: string;
  customer?: {
    id: string;
    first_name: string;
    last_name?: string;
    email?: string;
    phone: string;
  };
  service?: {
    name: string;
  };
  technician?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
}

interface BusinessData {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

// EmailService with convenience functions
export const EmailService = {
  // Customer emails
  async sendAppointmentRequestReceived(
    appointment: AppointmentData,
    business: BusinessData
  ): Promise<EmailResult> {
    if (!appointment.customer?.email) {
      return { success: false, error: 'Customer has no email' };
    }

    const customerName = `${appointment.customer.first_name} ${appointment.customer.last_name || ''}`.trim();
    const template = appointmentRequestReceivedEmail({
      customerName,
      serviceName: appointment.service?.name || 'Service',
      requestedDate: formatDate(appointment.scheduled_date),
      businessName: business.name,
      businessPhone: business.phone || '',
    });

    return sendEmail({
      to: appointment.customer.email,
      toName: customerName,
      ...template,
      businessId: business.id,
      emailType: 'appointment_request_received',
      recipientType: 'customer',
      appointmentId: appointment.id,
      customerId: appointment.customer.id,
    });
  },

  // Lead / customer without appointment yet
  async sendAppointmentRequestReceivedLead(params: {
    to: string;
    toName: string;
    customerId?: string;
    serviceName: string;
    requestedDate: string;
    business: BusinessData;
  }): Promise<EmailResult> {
    const template = appointmentRequestReceivedEmail({
      customerName: params.toName,
      serviceName: params.serviceName,
      requestedDate: params.requestedDate,
      businessName: params.business.name,
      businessPhone: params.business.phone || '',
    });

    return sendEmail({
      to: params.to,
      toName: params.toName,
      ...template,
      businessId: params.business.id,
      emailType: 'appointment_request_received',
      recipientType: 'customer',
      customerId: params.customerId,
    });
  },

  async sendAppointmentConfirmed(
    appointment: AppointmentData,
    business: BusinessData
  ): Promise<EmailResult> {
    if (!appointment.customer?.email) {
      return { success: false, error: 'Customer has no email' };
    }

    const customerName = `${appointment.customer.first_name} ${appointment.customer.last_name || ''}`.trim();
    const technicianName = appointment.technician 
      ? `${appointment.technician.first_name || ''} ${appointment.technician.last_name || ''}`.trim()
      : undefined;
    
    const template = appointmentConfirmedEmail({
      customerName,
      serviceName: appointment.service?.name || 'Service',
      scheduledDate: formatDate(appointment.scheduled_date),
      timeWindow: formatTimeWindow(appointment.scheduled_start_time, appointment.scheduled_end_time),
      address: appointment.address,
      technicianName,
      referenceCode: appointment.ref_code || '',
      businessName: business.name,
      businessPhone: business.phone || '',
      notes: appointment.customer_notes,
    });

    return sendEmail({
      to: appointment.customer.email,
      toName: customerName,
      ...template,
      businessId: business.id,
      emailType: 'appointment_confirmed',
      recipientType: 'customer',
      appointmentId: appointment.id,
      customerId: appointment.customer.id,
    });
  },

  async sendAppointmentReminder(
    appointment: AppointmentData,
    business: BusinessData,
    hoursUntil: 24 | 1
  ): Promise<EmailResult> {
    if (!appointment.customer?.email) {
      return { success: false, error: 'Customer has no email' };
    }

    const customerName = `${appointment.customer.first_name} ${appointment.customer.last_name || ''}`.trim();
    const template = appointmentReminderEmail({
      customerName,
      serviceName: appointment.service?.name || 'Service',
      scheduledDate: formatDate(appointment.scheduled_date),
      timeWindow: formatTimeWindow(appointment.scheduled_start_time, appointment.scheduled_end_time),
      address: appointment.address,
      referenceCode: appointment.ref_code || '',
      businessName: business.name,
      businessPhone: business.phone || '',
      hoursUntil,
    });

    return sendEmail({
      to: appointment.customer.email,
      toName: customerName,
      ...template,
      businessId: business.id,
      emailType: `appointment_reminder_${hoursUntil}h`,
      recipientType: 'customer',
      appointmentId: appointment.id,
      customerId: appointment.customer.id,
    });
  },

  async sendAppointmentRescheduled(
    appointment: AppointmentData,
    oldDate: string,
    oldStartTime: string,
    oldEndTime: string,
    business: BusinessData
  ): Promise<EmailResult> {
    if (!appointment.customer?.email) {
      return { success: false, error: 'Customer has no email' };
    }

    const customerName = `${appointment.customer.first_name} ${appointment.customer.last_name || ''}`.trim();
    const template = appointmentRescheduledEmail({
      customerName,
      serviceName: appointment.service?.name || 'Service',
      oldDate: formatDate(oldDate),
      oldTime: formatTimeWindow(oldStartTime, oldEndTime),
      newDate: formatDate(appointment.scheduled_date),
      newTime: formatTimeWindow(appointment.scheduled_start_time, appointment.scheduled_end_time),
      address: appointment.address,
      referenceCode: appointment.ref_code || '',
      businessName: business.name,
      businessPhone: business.phone || '',
    });

    return sendEmail({
      to: appointment.customer.email,
      toName: customerName,
      ...template,
      businessId: business.id,
      emailType: 'appointment_rescheduled',
      recipientType: 'customer',
      appointmentId: appointment.id,
      customerId: appointment.customer.id,
    });
  },

  async sendAppointmentCancelled(
    appointment: AppointmentData,
    business: BusinessData,
    cancelledBy: 'customer' | 'business',
    reason?: string
  ): Promise<EmailResult> {
    if (!appointment.customer?.email) {
      return { success: false, error: 'Customer has no email' };
    }

    const customerName = `${appointment.customer.first_name} ${appointment.customer.last_name || ''}`.trim();
    const template = appointmentCancelledEmail({
      customerName,
      serviceName: appointment.service?.name || 'Service',
      scheduledDate: formatDate(appointment.scheduled_date),
      timeWindow: formatTimeWindow(appointment.scheduled_start_time, appointment.scheduled_end_time),
      referenceCode: appointment.ref_code || '',
      businessName: business.name,
      businessPhone: business.phone || '',
      cancelledBy,
      reason,
    });

    return sendEmail({
      to: appointment.customer.email,
      toName: customerName,
      ...template,
      businessId: business.id,
      emailType: 'appointment_cancelled',
      recipientType: 'customer',
      appointmentId: appointment.id,
      customerId: appointment.customer.id,
    });
  },

  async sendTechnicianEnRoute(
    appointment: AppointmentData,
    business: BusinessData,
    estimatedMinutes: number
  ): Promise<EmailResult> {
    if (!appointment.customer?.email) {
      return { success: false, error: 'Customer has no email' };
    }

    const customerName = `${appointment.customer.first_name} ${appointment.customer.last_name || ''}`.trim();
    const technicianName = appointment.technician 
      ? `${appointment.technician.first_name || ''} ${appointment.technician.last_name || ''}`.trim()
      : 'Your technician';

    const template = technicianEnRouteEmail({
      customerName,
      technicianName,
      technicianPhone: appointment.technician?.phone,
      estimatedArrival: `about ${estimatedMinutes} minutes`,
      serviceName: appointment.service?.name || 'Service',
      businessName: business.name,
      businessPhone: business.phone || '',
    });

    return sendEmail({
      to: appointment.customer.email,
      toName: customerName,
      ...template,
      businessId: business.id,
      emailType: 'technician_en_route',
      recipientType: 'customer',
      appointmentId: appointment.id,
      customerId: appointment.customer.id,
    });
  },

  async sendAppointmentCompleted(
    appointment: AppointmentData,
    business: BusinessData,
    invoiceAmount?: string
  ): Promise<EmailResult> {
    if (!appointment.customer?.email) {
      return { success: false, error: 'Customer has no email' };
    }

    const customerName = `${appointment.customer.first_name} ${appointment.customer.last_name || ''}`.trim();
    const technicianName = appointment.technician 
      ? `${appointment.technician.first_name || ''} ${appointment.technician.last_name || ''}`.trim()
      : 'Our team';

    const template = appointmentCompletedEmail({
      customerName,
      serviceName: appointment.service?.name || 'Service',
      technicianName,
      completedDate: formatDate(appointment.scheduled_date),
      referenceCode: appointment.ref_code || '',
      businessName: business.name,
      businessPhone: business.phone || '',
      invoiceAmount,
    });

    return sendEmail({
      to: appointment.customer.email,
      toName: customerName,
      ...template,
      businessId: business.id,
      emailType: 'appointment_completed',
      recipientType: 'customer',
      appointmentId: appointment.id,
      customerId: appointment.customer.id,
    });
  },

  // Technician emails
  async sendTechNewAssignment(
    appointment: AppointmentData,
    business: BusinessData
  ): Promise<EmailResult> {
    if (!appointment.technician?.email) {
      return { success: false, error: 'Technician has no email' };
    }

    const technicianName = `${appointment.technician.first_name || ''} ${appointment.technician.last_name || ''}`.trim();
    const customerName = `${appointment.customer?.first_name || ''} ${appointment.customer?.last_name || ''}`.trim();

    const template = techNewAssignmentEmail({
      technicianName,
      customerName,
      customerPhone: appointment.customer?.phone || '',
      customerEmail: appointment.customer?.email,
      serviceName: appointment.service?.name || 'Service',
      scheduledDate: formatDate(appointment.scheduled_date),
      timeWindow: formatTimeWindow(appointment.scheduled_start_time, appointment.scheduled_end_time),
      address: appointment.address,
      notes: appointment.customer_notes,
      referenceCode: appointment.ref_code || '',
      businessName: business.name,
    });

    return sendEmail({
      to: appointment.technician.email,
      toName: technicianName,
      ...template,
      businessId: business.id,
      emailType: 'tech_new_assignment',
      recipientType: 'technician',
      appointmentId: appointment.id,
      userId: appointment.technician.id,
    });
  },

  // Admin notification
  async sendAdminNewAppointment(
    appointment: AppointmentData,
    business: BusinessData,
    adminEmail: string,
    adminName: string
  ): Promise<EmailResult> {
    const customerName = `${appointment.customer?.first_name || ''} ${appointment.customer?.last_name || ''}`.trim();
    const technicianName = appointment.technician 
      ? `${appointment.technician.first_name || ''} ${appointment.technician.last_name || ''}`.trim()
      : undefined;

    const template = adminNewAppointmentEmail({
      adminName,
      customerName,
      customerPhone: appointment.customer?.phone || '',
      customerEmail: appointment.customer?.email,
      serviceName: appointment.service?.name || 'Service',
      scheduledDate: formatDate(appointment.scheduled_date),
      timeWindow: formatTimeWindow(appointment.scheduled_start_time, appointment.scheduled_end_time),
      address: appointment.address,
      technicianName,
      referenceCode: appointment.ref_code || '',
      businessName: business.name,
      source: appointment.source || 'manual',
    });

    return sendEmail({
      to: adminEmail,
      toName: adminName,
      ...template,
      businessId: business.id,
      emailType: 'admin_new_appointment',
      recipientType: 'admin',
      appointmentId: appointment.id,
    });
  },

  // Invoice Sent
  async sendInvoiceSent(params: {
    customerEmail: string;
    customerName: string;
    customerId: string;
    invoiceNumber: string;
    invoiceTotal: string;
    dueDate?: string;
    invoiceUrl?: string;
    business: BusinessData;
    appointmentId?: string;
  }): Promise<EmailResult> {
    const template = invoiceSentEmail({
      customerName: params.customerName,
      invoiceNumber: params.invoiceNumber,
      invoiceTotal: params.invoiceTotal,
      dueDate: params.dueDate,
      invoiceUrl: params.invoiceUrl,
      businessName: params.business.name,
      businessPhone: params.business.phone || '',
    });

    return sendEmail({
      to: params.customerEmail,
      toName: params.customerName,
      ...template,
      businessId: params.business.id,
      emailType: 'invoice_sent',
      recipientType: 'customer',
      appointmentId: params.appointmentId,
      customerId: params.customerId,
    });
  },

  // Follow-up
  async sendFollowUp(
    appointment: AppointmentData,
    business: BusinessData,
    reviewUrl?: string
  ): Promise<EmailResult> {
    if (!appointment.customer?.email) {
      return { success: false, error: 'Customer has no email' };
    }

    const customerName = `${appointment.customer.first_name} ${appointment.customer.last_name || ''}`.trim();
    const template = followUpEmail({
      customerName,
      serviceName: appointment.service?.name || 'Service',
      completedDate: formatDate(appointment.scheduled_date),
      businessName: business.name,
      businessPhone: business.phone || '',
      reviewUrl,
    });

    return sendEmail({
      to: appointment.customer.email,
      toName: customerName,
      ...template,
      businessId: business.id,
      emailType: 'follow_up',
      recipientType: 'customer',
      appointmentId: appointment.id,
      customerId: appointment.customer.id,
    });
  },

  // Tech Assignment Changed
  async sendTechAssignmentChanged(
    appointment: AppointmentData,
    business: BusinessData,
    oldDate: string,
    oldStartTime: string,
    oldEndTime: string
  ): Promise<EmailResult> {
    if (!appointment.technician?.email) {
      return { success: false, error: 'Technician has no email' };
    }

    const technicianName = `${appointment.technician.first_name || ''} ${appointment.technician.last_name || ''}`.trim();
    const customerName = `${appointment.customer?.first_name || ''} ${appointment.customer?.last_name || ''}`.trim();

    const template = techAssignmentChangedEmail({
      technicianName,
      customerName,
      serviceName: appointment.service?.name || 'Service',
      scheduledDate: formatDate(appointment.scheduled_date),
      timeWindow: formatTimeWindow(appointment.scheduled_start_time, appointment.scheduled_end_time),
      address: appointment.address,
      referenceCode: appointment.ref_code || '',
      businessName: business.name,
    });

    return sendEmail({
      to: appointment.technician.email,
      toName: technicianName,
      ...template,
      businessId: business.id,
      emailType: 'tech_assignment_changed',
      recipientType: 'technician',
      appointmentId: appointment.id,
      userId: appointment.technician.id,
    });
  },

  // Tech Assignment Cancelled
  async sendTechAssignmentCancelled(
    appointment: AppointmentData,
    business: BusinessData,
    reason?: string
  ): Promise<EmailResult> {
    if (!appointment.technician?.email) {
      return { success: false, error: 'Technician has no email' };
    }

    const technicianName = `${appointment.technician.first_name || ''} ${appointment.technician.last_name || ''}`.trim();
    const customerName = `${appointment.customer?.first_name || ''} ${appointment.customer?.last_name || ''}`.trim();

    const template = techAssignmentCancelledEmail({
      technicianName,
      customerName,
      serviceName: appointment.service?.name || 'Service',
      scheduledDate: formatDate(appointment.scheduled_date),
      timeWindow: formatTimeWindow(appointment.scheduled_start_time, appointment.scheduled_end_time),
      referenceCode: appointment.ref_code || '',
      businessName: business.name,
      reason,
    });

    return sendEmail({
      to: appointment.technician.email,
      toName: technicianName,
      ...template,
      businessId: business.id,
      emailType: 'tech_assignment_cancelled',
      recipientType: 'technician',
      appointmentId: appointment.id,
      userId: appointment.technician.id,
    });
  },

  // Tech Daily Schedule
  async sendTechDailySchedule(params: {
    technicianEmail: string;
    technicianName: string;
    technicianId: string;
    date: string;
    items: Array<{
      timeWindow: string;
      customerName: string;
      address: string;
      serviceName: string;
      referenceCode?: string;
    }>;
    business: BusinessData;
  }): Promise<EmailResult> {
    const template = techDailyScheduleEmail({
      technicianName: params.technicianName,
      date: params.date,
      items: params.items,
      businessName: params.business.name,
    });

    return sendEmail({
      to: params.technicianEmail,
      toName: params.technicianName,
      ...template,
      businessId: params.business.id,
      emailType: 'tech_daily_schedule',
      recipientType: 'technician',
      userId: params.technicianId,
    });
  },

  // Admin Appointment Cancelled
  async sendAdminAppointmentCancelled(
    appointment: AppointmentData,
    business: BusinessData,
    adminEmail: string,
    adminName: string,
    reason?: string
  ): Promise<EmailResult> {
    const customerName = `${appointment.customer?.first_name || ''} ${appointment.customer?.last_name || ''}`.trim();

    const template = adminAppointmentCancelledEmail({
      adminName,
      customerName,
      serviceName: appointment.service?.name || 'Service',
      scheduledDate: formatDate(appointment.scheduled_date),
      timeWindow: formatTimeWindow(appointment.scheduled_start_time, appointment.scheduled_end_time),
      referenceCode: appointment.ref_code || '',
      businessName: business.name,
      reason,
    });

    return sendEmail({
      to: adminEmail,
      toName: adminName,
      ...template,
      businessId: business.id,
      emailType: 'admin_appointment_cancelled',
      recipientType: 'admin',
      appointmentId: appointment.id,
    });
  },

  // Admin Daily Summary
  async sendAdminDailySummary(params: {
    adminEmail: string;
    adminName: string;
    date: string;
    newAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    revenue?: string;
    business: BusinessData;
  }): Promise<EmailResult> {
    const template = adminDailySummaryEmail({
      adminName: params.adminName,
      date: params.date,
      newAppointments: params.newAppointments,
      completedAppointments: params.completedAppointments,
      cancelledAppointments: params.cancelledAppointments,
      revenue: params.revenue,
      businessName: params.business.name,
    });

    return sendEmail({
      to: params.adminEmail,
      toName: params.adminName,
      ...template,
      businessId: params.business.id,
      emailType: 'admin_daily_summary',
      recipientType: 'admin',
    });
  },

  // Admin Weekly Report
  async sendAdminWeeklyReport(params: {
    adminEmail: string;
    adminName: string;
    weekRange: string;
    newAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    revenue?: string;
    business: BusinessData;
  }): Promise<EmailResult> {
    const template = adminWeeklyReportEmail({
      adminName: params.adminName,
      weekRange: params.weekRange,
      newAppointments: params.newAppointments,
      completedAppointments: params.completedAppointments,
      cancelledAppointments: params.cancelledAppointments,
      revenue: params.revenue,
      businessName: params.business.name,
    });

    return sendEmail({
      to: params.adminEmail,
      toName: params.adminName,
      ...template,
      businessId: params.business.id,
      emailType: 'admin_weekly_report',
      recipientType: 'admin',
    });
  },

  // Manual email
  async sendManualEmail(params: {
    to: string;
    toName: string;
    subject: string;
    message: string;
    businessId: string;
    customerId?: string;
    appointmentId?: string;
    businessName: string;
    businessPhone: string;
  }): Promise<EmailResult> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #F97316; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #e5e5e5; }
          .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin:0;">${params.businessName}</h2>
          </div>
          <div class="content">
            <p>Hi ${params.toName},</p>
            ${params.message.split('\n').map(p => `<p>${p}</p>`).join('')}
          </div>
          <div class="footer">
            <p>${params.businessName} | ${params.businessPhone}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return sendEmail({
      to: params.to,
      toName: params.toName,
      subject: params.subject,
      html,
      businessId: params.businessId,
      emailType: 'manual',
      recipientType: 'customer',
      appointmentId: params.appointmentId,
      customerId: params.customerId,
    });
  },
};
