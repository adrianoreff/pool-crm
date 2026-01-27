import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

// Resend webhook event types
// https://resend.com/docs/dashboard/webhooks/event-types
interface ResendWebhookEvent {
  type: 
    | "email.sent" 
    | "email.delivered" 
    | "email.delivery_delayed"
    | "email.complained"
    | "email.bounced" 
    | "email.opened" 
    | "email.clicked";
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    // For click events
    click?: {
      link: string;
      timestamp: string;
    };
    // For bounce events
    bounce?: {
      message: string;
    };
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const event: ResendWebhookEvent = await req.json();
    
    console.log("Received Resend webhook event:", event.type, event.data.email_id);

    const emailId = event.data.email_id;
    const now = new Date().toISOString();

    if (!emailId) {
      console.error("No email_id in webhook event");
      return new Response(JSON.stringify({ error: "Missing email_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map Resend event types to our status and update fields
    let updateData: Record<string, unknown> = {
      updated_at: now,
    };

    switch (event.type) {
      case "email.sent":
        updateData.status = "sent";
        updateData.sent_at = now;
        break;

      case "email.delivered":
        updateData.status = "delivered";
        updateData.delivered_at = now;
        break;

      case "email.delivery_delayed":
        // Keep status as sent but log the delay
        updateData.metadata = { delivery_delayed_at: now };
        break;

      case "email.opened":
        updateData.status = "opened";
        updateData.opened_at = now;
        break;

      case "email.clicked":
        updateData.status = "clicked";
        updateData.clicked_at = now;
        if (event.data.click?.link) {
          updateData.metadata = { clicked_link: event.data.click.link };
        }
        break;

      case "email.bounced":
        updateData.status = "bounced";
        updateData.bounced_at = now;
        updateData.error_message = event.data.bounce?.message || "Email bounced";
        break;

      case "email.complained":
        updateData.status = "failed";
        updateData.failed_at = now;
        updateData.error_message = "Recipient marked as spam";
        break;

      default:
        console.log("Unknown event type:", event.type);
        return new Response(JSON.stringify({ received: true, message: "Unknown event type" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Update the email log by resend_id
    const { data, error } = await supabase
      .from("email_logs")
      .update(updateData)
      .eq("resend_id", emailId)
      .select("id, status")
      .maybeSingle();

    if (error) {
      console.error("Error updating email_logs:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!data) {
      console.log("No email log found for resend_id:", emailId);
      // Return success anyway - the email might not be in our system
      return new Response(JSON.stringify({ received: true, message: "Email not found in logs" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Updated email log:", data.id, "to status:", data.status);

    return new Response(JSON.stringify({ success: true, emailLogId: data.id, status: data.status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook processing error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
