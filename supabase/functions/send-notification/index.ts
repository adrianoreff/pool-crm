import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "resend";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "appointment_confirmation" | "appointment_rescheduled" | "appointment_cancelled" | "appointment_reminder";
  appointmentId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const resend = new Resend(RESEND_API_KEY);

  try {
    const { type, appointmentId }: NotificationRequest = await req.json();

    // Get appointment with related data
    const { data: appointment, error } = await supabase
      .from("appointments")
      .select(`
        *,
        customer:customers(first_name, last_name, email, phone),
        service:services(name),
        technician:users(first_name, last_name),
        business:businesses(name, phone, email, address, city, state)
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
    const timeFormatted = appointment.scheduled_start_time.slice(0, 5);

    const customerName = `${appointment.customer.first_name} ${appointment.customer.last_name || ""}`.trim();
    const businessName = appointment.business.name;
    const serviceName = appointment.service?.name || "Service";
    const technicianName = appointment.technician
      ? `${appointment.technician.first_name} ${appointment.technician.last_name || ""}`.trim()
      : "A technician";

    let subject: string;
    let htmlContent: string;

    const baseStyles = `
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 32px;
      background-color: #ffffff;
    `;

    const buttonStyles = `
      display: inline-block;
      background-color: #F97316;
      color: #ffffff;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 16px 0;
    `;

    const cardStyles = `
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    `;

    switch (type) {
      case "appointment_confirmation":
        subject = `Appointment Confirmation - ${businessName}`;
        htmlContent = `
          <div style="${baseStyles}">
            <h1 style="color: #0f172a; margin-bottom: 8px;">Appointment Requested!</h1>
            <p style="color: #64748b; font-size: 16px;">Hi ${customerName},</p>
            <p style="color: #64748b;">Your appointment has been requested and is pending confirmation. Here are the details:</p>
            
            <div style="${cardStyles}">
              <p style="margin: 8px 0;"><strong>Service:</strong> ${serviceName}</p>
              <p style="margin: 8px 0;"><strong>Date:</strong> ${dateFormatted}</p>
              <p style="margin: 8px 0;"><strong>Time:</strong> ${timeFormatted}</p>
              <p style="margin: 8px 0;"><strong>Address:</strong> ${appointment.address}</p>
              <p style="margin: 8px 0;"><strong>Reference:</strong> ${appointment.ref_code}</p>
            </div>

            <p style="color: #64748b;">We will confirm your appointment shortly.</p>
            <p style="color: #64748b;">If you need to make changes, please call us at <strong>${appointment.business.phone}</strong>.</p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 14px;">Thank you for choosing ${businessName}!</p>
          </div>
        `;
        break;

      case "appointment_rescheduled":
        subject = `Appointment Rescheduled - ${businessName}`;
        htmlContent = `
          <div style="${baseStyles}">
            <h1 style="color: #0f172a; margin-bottom: 8px;">Appointment Rescheduled</h1>
            <p style="color: #64748b; font-size: 16px;">Hi ${customerName},</p>
            <p style="color: #64748b;">Your appointment has been rescheduled. Here are the new details:</p>
            
            <div style="${cardStyles}">
              <p style="margin: 8px 0;"><strong>Service:</strong> ${serviceName}</p>
              <p style="margin: 8px 0;"><strong>New Date:</strong> ${dateFormatted}</p>
              <p style="margin: 8px 0;"><strong>New Time:</strong> ${timeFormatted}</p>
              <p style="margin: 8px 0;"><strong>Address:</strong> ${appointment.address}</p>
              <p style="margin: 8px 0;"><strong>Reference:</strong> ${appointment.ref_code}</p>
            </div>

            <p style="color: #64748b;">Thank you for your flexibility!</p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 14px;">${businessName}</p>
          </div>
        `;
        break;

      case "appointment_cancelled":
        subject = `Appointment Cancelled - ${businessName}`;
        htmlContent = `
          <div style="${baseStyles}">
            <h1 style="color: #0f172a; margin-bottom: 8px;">Appointment Cancelled</h1>
            <p style="color: #64748b; font-size: 16px;">Hi ${customerName},</p>
            <p style="color: #64748b;">Your appointment has been cancelled as requested.</p>
            
            <div style="${cardStyles}">
              <p style="margin: 8px 0;"><strong>Cancelled Appointment:</strong></p>
              <p style="margin: 8px 0;">${serviceName} on ${dateFormatted} at ${timeFormatted}</p>
              <p style="margin: 8px 0;"><strong>Reference:</strong> ${appointment.ref_code}</p>
            </div>

            <p style="color: #64748b;">If you'd like to schedule a new appointment, please call us at <strong>${appointment.business.phone}</strong>.</p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 14px;">We hope to see you soon! - ${businessName}</p>
          </div>
        `;
        break;

      case "appointment_reminder":
        subject = `Reminder: Your Appointment Tomorrow - ${businessName}`;
        htmlContent = `
          <div style="${baseStyles}">
            <h1 style="color: #0f172a; margin-bottom: 8px;">Appointment Reminder</h1>
            <p style="color: #64748b; font-size: 16px;">Hi ${customerName},</p>
            <p style="color: #64748b;">This is a friendly reminder about your upcoming appointment:</p>
            
            <div style="${cardStyles}">
              <p style="margin: 8px 0;"><strong>Service:</strong> ${serviceName}</p>
              <p style="margin: 8px 0;"><strong>Date:</strong> ${dateFormatted}</p>
              <p style="margin: 8px 0;"><strong>Time:</strong> ${timeFormatted}</p>
              <p style="margin: 8px 0;"><strong>Address:</strong> ${appointment.address}</p>
              <p style="margin: 8px 0;"><strong>Technician:</strong> ${technicianName}</p>
            </div>

            <p style="color: #64748b;">Need to reschedule? Call us at <strong>${appointment.business.phone}</strong>.</p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 14px;">See you soon! - ${businessName}</p>
          </div>
        `;
        break;

      default:
        return new Response(JSON.stringify({ error: "Unknown notification type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Send email via Resend
    // Note: Replace 'onboarding@resend.dev' with your verified domain sender
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `${businessName} <onboarding@resend.dev>`,
      to: appointment.customer.email,
      subject,
      html: htmlContent,
    });

    if (emailError) {
      console.error("Email send error:", emailError);
      throw emailError;
    }

    // Log the notification
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
