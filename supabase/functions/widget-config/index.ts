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
    const url = new URL(req.url);
    const embedCode = url.searchParams.get("embed_code");

    if (!embedCode) {
      return new Response(JSON.stringify({ error: "embed_code required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get widget config
    const { data: widget, error: widgetError } = await supabase
      .from("widget_config")
      .select(`
        *,
        business:businesses(
          id,
          name,
          phone,
          address,
          city,
          state
        )
      `)
      .eq("embed_code", embedCode)
      .single();

    if (widgetError || !widget) {
      return new Response(JSON.stringify({ error: "Widget not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!widget.is_active) {
      return new Response(JSON.stringify({ error: "Widget is not active" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const businessId = widget.business.id;

    // Operating hours
    const { data: hours } = await supabase
      .from("operating_hours")
      .select("*")
      .eq("business_id", businessId);

    // Booking rules
    const { data: rules } = await supabase
      .from("booking_rules")
      .select("*")
      .eq("business_id", businessId)
      .single();

    // Services
    const { data: services } = await supabase
      .from("services")
      .select(`
        id,
        name,
        description,
        duration_min,
        duration_max,
        category:service_categories(name)
      `)
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("sort_order");

    return new Response(
      JSON.stringify({
        business: widget.business,
        appearance: {
          buttonText: widget.button_text,
          buttonPosition: widget.button_position,
          primaryColor: widget.primary_color,
          buttonTextColor: widget.button_text_color,
          backgroundColor: widget.background_color,
          textColor: widget.text_color,
          borderColor: widget.border_color,
        },
        operatingHours: hours,
        bookingRules: rules,
        services,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Widget config error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
