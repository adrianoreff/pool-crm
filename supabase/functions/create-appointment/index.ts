import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateAppointmentRequest {
  embedCode: string;
  customer: {
    firstName: string;
    lastName?: string;
    phone: string;
    email?: string;
  };
  serviceId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body: CreateAppointmentRequest = await req.json();
    const { embedCode, customer, serviceId, date, time, address, city, state, zipCode, notes } = body;

    // Validate required fields
    if (!embedCode || !customer?.firstName || !customer?.phone || !serviceId || !date || !time || !address) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
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
      return new Response(JSON.stringify({ error: "Invalid widget" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const businessId = widget.business_id;

    // Get service duration
    const { data: service } = await supabase
      .from("services")
      .select("id, duration_max, name")
      .eq("id", serviceId)
      .eq("business_id", businessId)
      .single();

    if (!service) {
      return new Response(JSON.stringify({ error: "Service not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate end time
    const duration = service.duration_max || 60;
    const [hours, minutes] = time.split(":").map(Number);
    const endMinutes = hours * 60 + minutes + duration;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

    // Find or create customer
    let customerId: string;
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("business_id", businessId)
      .eq("phone", customer.phone)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      
      // Update customer info if provided
      await supabase
        .from("customers")
        .update({
          first_name: customer.firstName,
          last_name: customer.lastName || null,
          email: customer.email || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", customerId);
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from("customers")
        .insert({
          business_id: businessId,
          first_name: customer.firstName,
          last_name: customer.lastName || null,
          phone: customer.phone,
          email: customer.email || null,
          address,
          city: city || null,
          state: state || null,
          zip_code: zipCode || null,
          source: "widget",
        })
        .select()
        .single();

      if (customerError || !newCustomer) {
        console.error("Customer creation error:", customerError);
        return new Response(JSON.stringify({ error: "Failed to create customer" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      customerId = newCustomer.id;
    }

    // Check availability before creating
    const { data: slots } = await supabase.rpc("get_available_slots", {
      p_business_id: businessId,
      p_date: date,
      p_duration_minutes: duration,
    });

    const requestedSlot = (slots || []).find((s: { slot_time: string; is_available: boolean }) => 
      s.slot_time === time && s.is_available
    );

    if (!requestedSlot) {
      return new Response(JSON.stringify({ error: "Selected time slot is no longer available" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get booking rules to check auto-confirm
    const { data: rules } = await supabase
      .from("booking_rules")
      .select("auto_confirm")
      .eq("business_id", businessId)
      .single();

    const initialStatus = rules?.auto_confirm ? "scheduled" : "pending_confirmation";

    // Create appointment
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .insert({
        business_id: businessId,
        customer_id: customerId,
        service_id: serviceId,
        scheduled_date: date,
        scheduled_start_time: time,
        scheduled_end_time: endTime,
        status: initialStatus,
        address,
        city: city || null,
        state: state || null,
        zip_code: zipCode || null,
        customer_notes: notes || null,
        source: "widget",
        confirmed_at: rules?.auto_confirm ? new Date().toISOString() : null,
      })
      .select("id, ref_code, portal_token")
      .single();

    if (appointmentError || !appointment) {
      console.error("Appointment creation error:", appointmentError);
      return new Response(JSON.stringify({ error: "Failed to create appointment" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log activity
    await supabase.from("appointment_activity").insert({
      appointment_id: appointment.id,
      action: "created",
      description: `Appointment created via booking widget for ${service.name}`,
    });

    // Log widget analytics
    await supabase.from("widget_analytics").insert({
      business_id: businessId,
      event_type: "booking_completed",
      appointment_id: appointment.id,
      metadata: { serviceId, date, time },
    });

    // Send confirmation email (fire and forget)
    supabase.functions.invoke("send-notification", {
      body: { type: "appointment_confirmation", appointmentId: appointment.id },
    });

    return new Response(
      JSON.stringify({
        success: true,
        appointment: {
          id: appointment.id,
          referenceCode: appointment.ref_code,
          portalToken: appointment.portal_token,
          status: initialStatus,
          date,
          time,
          serviceName: service.name,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Create appointment error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
