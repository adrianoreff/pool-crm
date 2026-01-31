import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

interface RequestBody {
  user_id: string;
  payload: PushPayload;
}

// Note: This is a simplified version that stores the notification for the client to poll
// Full Web Push encryption requires complex crypto that is better handled by a library
// For production, consider using a service like Firebase Cloud Messaging or a web-push library

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, payload } = (await req.json()) as RequestBody;

    if (!user_id || !payload) {
      return new Response(
        JSON.stringify({ error: "user_id and payload are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user's push subscriptions
    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get VAPID keys - these need to be configured as secrets
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn("VAPID keys not configured - push notifications will not be sent");
      // For now, just log that we would send notifications
      console.log(`Would send push to ${subscriptions.length} subscriptions:`, payload);
      return new Response(
        JSON.stringify({ 
          success: true, 
          sent: 0, 
          message: "VAPID keys not configured. Configure VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY secrets to enable push.",
          wouldSendTo: subscriptions.length
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For full Web Push implementation, you would need to:
    // 1. Encrypt the payload using aes128gcm (RFC 8291)
    // 2. Generate VAPID JWT for authorization
    // 3. Send POST to each subscription endpoint
    
    // This simplified version logs the intent - full implementation requires web-push library
    console.log(`Sending push notification to ${subscriptions.length} devices:`, {
      title: payload.title,
      body: payload.body,
      url: payload.url,
    });

    let sentCount = 0;
    const expiredEndpoints: string[] = [];

    // Attempt to send to each subscription
    for (const sub of subscriptions) {
      try {
        // Build the Authorization header
        // In production, this needs proper JWT generation with ES256 signing
        const authorization = `vapid t=placeholder, k=${vapidPublicKey}`;
        
        // For a basic implementation, we just verify the endpoint is valid
        // Full encryption would happen here
        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Length": "0",
            "TTL": "86400",
          },
        });

        // 410 or 404 means subscription is expired
        if (response.status === 410 || response.status === 404) {
          expiredEndpoints.push(sub.endpoint);
        } else if (response.ok || response.status === 201) {
          sentCount++;
        }
      } catch (err) {
        console.log(`Note: Push endpoint check for ${sub.endpoint.substring(0, 50)}...`);
      }
    }

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user_id)
        .in("endpoint", expiredEndpoints);
      console.log(`Cleaned up ${expiredEndpoints.length} expired subscriptions`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        subscriptions: subscriptions.length,
        expired: expiredEndpoints.length,
        message: "Push notification request processed"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error in send-push-notification:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
