import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { embedCode, date, serviceId } = await req.json();

    if (!embedCode || !date) {
      return new Response(JSON.stringify({ error: "embedCode and date are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get business ID from embed code
    const { data: widget, error: widgetError } = await supabase
      .from("widget_config")
      .select("business_id")
      .eq("embed_code", embedCode)
      .eq("is_active", true)
      .single();

    if (widgetError || !widget) {
      return new Response(JSON.stringify({ error: "Widget not found or inactive" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get service duration if specified
    let duration = 60; // Default 1 hour
    if (serviceId) {
      const { data: service } = await supabase
        .from("services")
        .select("duration_max")
        .eq("id", serviceId)
        .single();

      if (service?.duration_max) {
        duration = service.duration_max;
      }
    }

    // Get available slots using database function
    const { data: slots, error: slotsError } = await supabase.rpc("get_available_slots", {
      p_business_id: widget.business_id,
      p_date: date,
      p_duration_minutes: duration,
    });

    if (slotsError) {
      console.error("Availability error:", slotsError);
      throw slotsError;
    }

    // Format response
    const formattedSlots = (slots || []).map((slot: {
      slot_time: string;
      is_available: boolean;
      technicians_available: string[] | null;
    }) => ({
      time: slot.slot_time,
      available: slot.is_available,
      techniciansAvailable: slot.technicians_available?.length || 0,
    }));

    return new Response(
      JSON.stringify({
        date,
        slots: formattedSlots,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Widget availability error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
