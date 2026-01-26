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
    const token = url.searchParams.get("token");
    const action = url.searchParams.get("action");

    if (!token) {
      return new Response(JSON.stringify({ error: "Token required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get appointment by portal token
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select(`
        *,
        customer:customers(first_name, last_name, email, phone),
        service:services(name, description),
        technician:users(first_name, last_name, phone),
        business:businesses(name, phone, email, address, city, state)
      `)
      .eq("portal_token", token)
      .single();

    if (appointmentError || !appointment) {
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle different actions
    if (req.method === "GET" && !action) {
      // Return appointment details
      return new Response(
        JSON.stringify({
          appointment: {
            id: appointment.id,
            referenceCode: appointment.ref_code,
            status: appointment.status,
            scheduledDate: appointment.scheduled_date,
            scheduledStartTime: appointment.scheduled_start_time,
            scheduledEndTime: appointment.scheduled_end_time,
            address: appointment.address,
            city: appointment.city,
            state: appointment.state,
            customerNotes: appointment.customer_notes,
          },
          customer: appointment.customer,
          service: appointment.service,
          technician: appointment.technician
            ? {
                name: `${appointment.technician.first_name} ${appointment.technician.last_name || ""}`.trim(),
                phone: appointment.technician.phone,
              }
            : null,
          business: appointment.business,
          canCancel: ["pending_confirmation", "scheduled"].includes(appointment.status),
          canReschedule: ["pending_confirmation", "scheduled"].includes(appointment.status),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (req.method === "POST" && action === "cancel") {
      // Cancel appointment
      if (!["pending_confirmation", "scheduled"].includes(appointment.status)) {
        return new Response(JSON.stringify({ error: "Appointment cannot be cancelled" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json().catch(() => ({}));
      const reason = body.reason || "Cancelled by customer via portal";

      await supabase
        .from("appointments")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason,
        })
        .eq("id", appointment.id);

      await supabase.from("appointment_activity").insert({
        appointment_id: appointment.id,
        action: "cancelled",
        description: `Cancelled by customer: ${reason}`,
      });

      // Send cancellation email
      supabase.functions.invoke("send-notification", {
        body: { type: "appointment_cancelled", appointmentId: appointment.id },
      });

      return new Response(JSON.stringify({ success: true, message: "Appointment cancelled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && action === "reschedule") {
      // Reschedule appointment
      if (!["pending_confirmation", "scheduled"].includes(appointment.status)) {
        return new Response(JSON.stringify({ error: "Appointment cannot be rescheduled" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const { newDate, newTime } = body;

      if (!newDate || !newTime) {
        return new Response(JSON.stringify({ error: "newDate and newTime required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Calculate duration
      const [startH, startM] = appointment.scheduled_start_time.split(":").map(Number);
      const [endH, endM] = appointment.scheduled_end_time.split(":").map(Number);
      const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);

      // Check availability
      const { data: slots } = await supabase.rpc("get_available_slots", {
        p_business_id: appointment.business_id,
        p_date: newDate,
        p_duration_minutes: durationMinutes,
      });

      const requestedSlot = (slots || []).find((s: { slot_time: string; is_available: boolean }) => 
        s.slot_time === newTime && s.is_available
      );

      if (!requestedSlot) {
        return new Response(JSON.stringify({ error: "Selected time slot is not available" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Calculate new end time
      const [newH, newM] = newTime.split(":").map(Number);
      const newEndMinutes = newH * 60 + newM + durationMinutes;
      const newEndTime = `${String(Math.floor(newEndMinutes / 60)).padStart(2, "0")}:${String(newEndMinutes % 60).padStart(2, "0")}`;

      await supabase
        .from("appointments")
        .update({
          scheduled_date: newDate,
          scheduled_start_time: newTime,
          scheduled_end_time: newEndTime,
          updated_at: new Date().toISOString(),
        })
        .eq("id", appointment.id);

      await supabase.from("appointment_activity").insert({
        appointment_id: appointment.id,
        action: "rescheduled",
        description: `Rescheduled by customer to ${newDate} at ${newTime}`,
        old_value: { date: appointment.scheduled_date, time: appointment.scheduled_start_time },
        new_value: { date: newDate, time: newTime },
      });

      // Send confirmation email
      supabase.functions.invoke("send-notification", {
        body: { type: "appointment_rescheduled", appointmentId: appointment.id },
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Appointment rescheduled",
          newDate,
          newTime,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (req.method === "GET" && action === "availability") {
      // Get available slots for rescheduling
      const date = url.searchParams.get("date");

      if (!date) {
        return new Response(JSON.stringify({ error: "date required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Calculate duration from existing appointment
      const [startH, startM] = appointment.scheduled_start_time.split(":").map(Number);
      const [endH, endM] = appointment.scheduled_end_time.split(":").map(Number);
      const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);

      const { data: slots, error: slotsError } = await supabase.rpc("get_available_slots", {
        p_business_id: appointment.business_id,
        p_date: date,
        p_duration_minutes: durationMinutes,
      });

      if (slotsError) {
        console.error("Availability error:", slotsError);
        throw slotsError;
      }

      const availableSlots = (slots || [])
        .filter((s: { is_available: boolean }) => s.is_available)
        .map((s: { slot_time: string }) => s.slot_time);

      return new Response(
        JSON.stringify({
          date,
          availableSlots,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Customer portal error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
