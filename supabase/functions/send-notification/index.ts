import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Types
interface StandardNotificationRequest {
  type: "appointment_confirmation" | "appointment_rescheduled" | "appointment_cancelled" | "appointment_reminder";
  appointmentId: string;
}

interface CustomEmailRequest {
  type: "custom_email";
  to: string;
  toName?: string;
  subject: string;
  html: string;
  businessId: string;
  emailType: string;
  recipientType: string;
  appointmentId?: string;
  customerId?: string;
  userId?: string;
}

type NotificationRequest = StandardNotificationRequest | CustomEmailRequest;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const resend = new Resend(RESEND_API_KEY);

  try {
    const body: NotificationRequest = await req.json();

    // Handle custom email request
    if (body.type === "custom_email") {
      const { to, toName, subject, html, businessId, emailType, recipientType, appointmentId, customerId, userId } = body;

      // Get business info for from address
      const { data: business } = await supabase
        .from("businesses")
        .select("name, email")
        .eq("id", businessId)
        .single();

      const businessName = business?.name || "Trade Services";
      
      // Send email via Resend
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: `${businessName} <onboarding@resend.dev>`,
        to: [to],
        subject,
        html,
      });

      if (emailError) {
        console.error("Email send error:", emailError);
        
        // Log failed email
        await supabase.from("email_logs").insert({
          business_id: businessId,
          email_type: emailType,
          recipient_type: recipientType,
          recipient_email: to,
          recipient_name: toName,
          subject,
          appointment_id: appointmentId,
          customer_id: customerId,
          user_id: userId,
          status: "failed",
          failed_at: new Date().toISOString(),
          error_message: emailError.message,
        });

        throw emailError;
      }

      // Log successful email
      await supabase.from("email_logs").insert({
        business_id: businessId,
        email_type: emailType,
        recipient_type: recipientType,
        recipient_email: to,
        recipient_name: toName,
        subject,
        appointment_id: appointmentId,
        customer_id: customerId,
        user_id: userId,
        resend_id: emailData?.id,
        status: "sent",
        sent_at: new Date().toISOString(),
      });

      return new Response(JSON.stringify({ success: true, emailId: emailData?.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle standard appointment notifications
    const { type, appointmentId } = body as StandardNotificationRequest;

    // Get appointment with related data
    const { data: appointment, error } = await supabase
      .from("appointments")
      .select(`
        *,
        customer:customers(id, first_name, last_name, email, phone),
        service:services(name),
        technician:users(id, first_name, last_name, email, phone),
        business:businesses(id, name, phone, email, address, city, state)
      `)
      .eq("id", appointmentId)
      .single();

    if (error || !appointment) {
      console.error("Appointment not found:", error);
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!appointment.customer?.email) {
      console.log("Customer has no email, skipping notification");
      return new Response(JSON.stringify({ success: true, message: "No email to send to" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format date and time
    const dateFormatted = new Date(appointment.scheduled_date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const startTime = appointment.scheduled_start_time.slice(0, 5);
    const endTime = appointment.scheduled_end_time.slice(0, 5);
    const formatTime = (t: string) => {
      const [h, m] = t.split(':');
      const hour = parseInt(h);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${m} ${ampm}`;
    };
    const timeWindow = `${formatTime(startTime)} - ${formatTime(endTime)}`;

    const customerName = `${appointment.customer.first_name} ${appointment.customer.last_name || ""}`.trim();
    const businessName = appointment.business.name;
    const serviceName = appointment.service?.name || "Service";
    const technicianName = appointment.technician
      ? `${appointment.technician.first_name} ${appointment.technician.last_name || ""}`.trim()
      : "A technician";

    let subject: string;
    let htmlContent: string;

    const baseStyles = `
      body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #F97316; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
      .header-success { background: #16A34A; }
      .header-info { background: #2563EB; }
      .header-neutral { background: #6B7280; }
      .content { background: #fff; padding: 30px; border: 1px solid #e5e5e5; }
      .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
      .details-box { background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 20px; margin: 20px 0; }
      .detail-row { padding: 8px 0; border-bottom: 1px solid #e5e5e5; }
      .reference { font-size: 24px; font-weight: bold; color: #F97316; letter-spacing: 2px; }
    `;

    switch (type) {
      case "appointment_confirmation":
        subject = `Appointment Confirmed ✓ ${dateFormatted} - ${businessName}`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head><style>${baseStyles}</style></head>
          <body>
            <div class="container">
              <div class="header header-success">
                <h1 style="margin:0;">Appointment Confirmed! ✓</h1>
              </div>
              <div class="content">
                <p>Hi ${customerName},</p>
                <p>Great news! Your appointment has been confirmed.</p>
                
                <div class="details-box">
                  <div style="text-align: center; margin-bottom: 15px;">
                    <div style="font-size: 12px; color: #666;">REFERENCE CODE</div>
                    <div class="reference">${appointment.ref_code || 'N/A'}</div>
                  </div>
                  <div class="detail-row"><strong>📅 Date:</strong> ${dateFormatted}</div>
                  <div class="detail-row"><strong>🕐 Time:</strong> ${timeWindow}</div>
                  <div class="detail-row"><strong>🔧 Service:</strong> ${serviceName}</div>
                  <div class="detail-row"><strong>📍 Address:</strong> ${appointment.address}</div>
                  ${appointment.technician ? `<div class="detail-row"><strong>👨‍🔧 Technician:</strong> ${technicianName}</div>` : ''}
                </div>

                <p><strong>What to expect:</strong></p>
                <ul>
                  <li>Our technician will call you ~30 minutes before arrival</li>
                  <li>You'll receive a reminder before your appointment</li>
                  <li>Please ensure someone 18+ is present</li>
                </ul>

                <p>Questions? Call us at <strong>${appointment.business.phone}</strong></p>
              </div>
              <div class="footer">
                <p>${businessName}<br>${appointment.business.phone}</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case "appointment_rescheduled":
        subject = `Appointment Rescheduled - ${dateFormatted} - ${businessName}`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head><style>${baseStyles}</style></head>
          <body>
            <div class="container">
              <div class="header header-info">
                <h1 style="margin:0;">📅 Appointment Rescheduled</h1>
              </div>
              <div class="content">
                <p>Hi ${customerName},</p>
                <p>Your appointment has been rescheduled. Here are the new details:</p>
                
                <div class="details-box">
                  <div class="detail-row"><strong>📅 New Date:</strong> ${dateFormatted}</div>
                  <div class="detail-row"><strong>🕐 New Time:</strong> ${timeWindow}</div>
                  <div class="detail-row"><strong>🔧 Service:</strong> ${serviceName}</div>
                  <div class="detail-row"><strong>📍 Address:</strong> ${appointment.address}</div>
                  <div class="detail-row"><strong>🏷️ Reference:</strong> ${appointment.ref_code || 'N/A'}</div>
                </div>

                <p>If this doesn't work, please call us at <strong>${appointment.business.phone}</strong>.</p>
              </div>
              <div class="footer">
                <p>${businessName} | ${appointment.business.phone}</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case "appointment_cancelled":
        subject = `Appointment Cancelled - ${appointment.ref_code || 'N/A'} - ${businessName}`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head><style>${baseStyles}</style></head>
          <body>
            <div class="container">
              <div class="header header-neutral">
                <h1 style="margin:0;">Appointment Cancelled</h1>
              </div>
              <div class="content">
                <p>Hi ${customerName},</p>
                <p>Your appointment has been cancelled.</p>
                
                <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="text-decoration: line-through; opacity: 0.7;">
                    <strong>${dateFormatted}</strong> at ${timeWindow}
                  </p>
                  <p><strong>Service:</strong> ${serviceName}</p>
                  <p><strong>Reference:</strong> ${appointment.ref_code || 'N/A'}</p>
                  ${appointment.cancellation_reason ? `<p><strong>Reason:</strong> ${appointment.cancellation_reason}</p>` : ''}
                </div>

                <p>We'd love to help you in the future! Call us at <strong>${appointment.business.phone}</strong> to reschedule.</p>
              </div>
              <div class="footer">
                <p>${businessName} | ${appointment.business.phone}</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case "appointment_reminder":
        subject = `Reminder: Your Appointment Tomorrow - ${businessName}`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head><style>${baseStyles}</style></head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin:0;">📅 Appointment Reminder</h1>
              </div>
              <div class="content">
                <p>Hi ${customerName},</p>
                <p>This is a friendly reminder about your upcoming appointment:</p>
                
                <div style="background: #FFF7ED; border: 1px solid #FDBA74; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                  <div style="font-size: 28px; font-weight: bold; color: #F97316;">${dateFormatted}</div>
                  <div style="font-size: 20px; color: #666;">${timeWindow}</div>
                  <hr style="margin: 15px 0; border: none; border-top: 1px solid #FDBA74;">
                  <p><strong>Service:</strong> ${serviceName}</p>
                  <p><strong>Address:</strong> ${appointment.address}</p>
                  <p><strong>Reference:</strong> ${appointment.ref_code || 'N/A'}</p>
                </div>

                <p><strong>Please remember:</strong></p>
                <ul>
                  <li>Someone 18+ should be present</li>
                  <li>Clear access to the work area if possible</li>
                </ul>

                <p>Need to reschedule? Call us at <strong>${appointment.business.phone}</strong>.</p>
              </div>
              <div class="footer">
                <p>${businessName} | ${appointment.business.phone}</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      default:
        return new Response(JSON.stringify({ error: "Unknown notification type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `${businessName} <onboarding@resend.dev>`,
      to: appointment.customer.email,
      subject,
      html: htmlContent,
    });

    if (emailError) {
      console.error("Email send error:", emailError);
      
      // Log failed notification
      await supabase.from("email_logs").insert({
        business_id: appointment.business_id,
        email_type: type,
        recipient_type: 'customer',
        recipient_email: appointment.customer.email,
        recipient_name: customerName,
        subject,
        appointment_id: appointmentId,
        customer_id: appointment.customer.id,
        status: "failed",
        failed_at: new Date().toISOString(),
        error_message: emailError.message,
      });

      throw emailError;
    }

    // Log the notification in email_logs
    await supabase.from("email_logs").insert({
      business_id: appointment.business_id,
      email_type: type,
      recipient_type: 'customer',
      recipient_email: appointment.customer.email,
      recipient_name: customerName,
      subject,
      appointment_id: appointmentId,
      customer_id: appointment.customer.id,
      resend_id: emailData?.id,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    // Also log to existing notification_log for backwards compatibility
    await supabase.from("notification_log").insert({
      business_id: appointment.business_id,
      type: "email",
      template_name: type,
      recipient_email: appointment.customer.email,
      subject,
      body: htmlContent,
      appointment_id: appointmentId,
      customer_id: appointment.customer_id,
      sent_at: new Date().toISOString(),
      resend_id: emailData?.id,
    });

    return new Response(JSON.stringify({ success: true, emailId: emailData?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Send notification error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
