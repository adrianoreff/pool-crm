import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

interface VapiCall {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  endedReason?: string;
  assistantId?: string;
  phoneNumberId?: string;
  customer?: {
    number?: string;
  };
  transcript?: string;
  summary?: string;
  recordingUrl?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Get business_id from request body or auth
    const body = await req.json().catch(() => ({}));
    const businessId = body.business_id;

    if (!businessId) {
      return new Response(
        JSON.stringify({ error: "business_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get business VAPI API key (stored encrypted or via assistant lookup)
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("id, vapi_assistant_id, vapi_api_key_encrypted")
      .eq("id", businessId)
      .single();

    if (bizError || !business) {
      console.error("Business not found:", bizError);
      return new Response(
        JSON.stringify({ error: "Business not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get VAPI API key from environment (shared key for now)
    const VAPI_API_KEY = Deno.env.get("VAPI_API_KEY");

    if (!VAPI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "VAPI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching calls from VAPI API for assistant:", business.vapi_assistant_id);

    // Fetch calls from VAPI API
    const vapiResponse = await fetch("https://api.vapi.ai/call?limit=100", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!vapiResponse.ok) {
      const errorText = await vapiResponse.text();
      console.error("VAPI API error:", vapiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `VAPI API error: ${vapiResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vapiCalls: VapiCall[] = await vapiResponse.json();
    console.log(`Received ${vapiCalls.length} calls from VAPI`);

    // Filter calls for this business's assistant
    const businessCalls = business.vapi_assistant_id
      ? vapiCalls.filter((call) => call.assistantId === business.vapi_assistant_id)
      : vapiCalls;

    console.log(`Filtered to ${businessCalls.length} calls for this business`);

    // Sync each call to the database
    const syncedCalls = [];
    const errors = [];

    for (const call of businessCalls) {
      try {
        // Calculate duration
        const startTime = new Date(call.createdAt).getTime();
        const endTime = new Date(call.updatedAt).getTime();
        const durationSeconds = Math.round((endTime - startTime) / 1000);

        // Determine outcome based on endedReason and status
        let outcome: string = "no_action";
        const endedReason = (call.endedReason || "").toLowerCase();
        const summary = (call.summary || "").toLowerCase();

        if (summary.includes("booked") || summary.includes("scheduled") || summary.includes("appointment")) {
          outcome = "booked";
        } else if (summary.includes("reschedule")) {
          outcome = "rescheduled";
        } else if (summary.includes("cancel")) {
          outcome = "cancelled";
        } else if (summary.includes("question") || summary.includes("info") || summary.includes("inquiry")) {
          outcome = "faq_answered";
        } else if (endedReason.includes("voicemail")) {
          outcome = "voicemail";
        } else if (endedReason.includes("no-answer") || endedReason.includes("busy")) {
          outcome = "missed";
        }

        const callData = {
          business_id: businessId,
          vapi_call_id: call.id,
          vapi_assistant_id: call.assistantId,
          caller_phone: call.customer?.number || "unknown",
          started_at: call.createdAt,
          ended_at: call.updatedAt,
          duration_seconds: durationSeconds > 0 ? durationSeconds : null,
          transcript: call.transcript || null,
          summary: call.summary || null,
          recording_url: call.recordingUrl || null,
          outcome: outcome,
          processed_at: new Date().toISOString(),
          vapi_data: call,
        };

        // Upsert the call log
        const { data, error } = await supabase
          .from("call_logs")
          .upsert(callData, {
            onConflict: "vapi_call_id",
            ignoreDuplicates: false,
          })
          .select()
          .single();

        if (error) {
          console.error("Error upserting call:", call.id, error);
          errors.push({ callId: call.id, error: error.message });
        } else {
          syncedCalls.push(data);

          // Try to match existing customer
          if (call.customer?.number && call.customer.number !== "unknown") {
            const { data: customer } = await supabase
              .from("customers")
              .select("id")
              .eq("business_id", businessId)
              .eq("phone", call.customer.number)
              .maybeSingle();

            if (customer) {
              await supabase
                .from("call_logs")
                .update({ customer_id: customer.id })
                .eq("id", data.id);
            }
          }
        }
      } catch (err) {
        console.error("Error processing call:", call.id, err);
        errors.push({ callId: call.id, error: (err as Error).message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalFromVapi: vapiCalls.length,
        filteredForBusiness: businessCalls.length,
        syncedCount: syncedCalls.length,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync VAPI calls error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
