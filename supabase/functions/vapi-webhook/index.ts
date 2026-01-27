// deno-lint-ignore-file no-explicit-any
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VapiToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: Record<string, any> | string;
  };
}

interface VapiWebhookPayload {
  message: {
    type: string;
    call?: {
      id: string;
      assistantId: string;
      phoneNumber?: { number: string };
      customer?: { number: string };
      startedAt?: string;
      endedAt?: string;
      transcript?: string;
      summary?: string;
      recordingUrl?: string;
    };
    functionCall?: {
      name: string;
      parameters: Record<string, any>;
    };
    toolCalls?: VapiToolCall[];
    transcript?: {
      role: string;
      content: string;
      timestamp: string;
    };
  };
  call?: {
    assistantId: string;
  };
  assistant?: {
    id: string;
  };
  assistantId?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Get raw body text first for debugging
    const rawBody = await req.text();
    console.log("Raw request body length:", rawBody.length);
    console.log("Raw request body preview:", rawBody.substring(0, 500));
    
    // Parse JSON - handle empty body
    let payload: any = {};
    if (rawBody && rawBody.trim()) {
      try {
        payload = JSON.parse(rawBody);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        return new Response(JSON.stringify({ error: "Invalid JSON", raw: rawBody.substring(0, 200) }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.error("Empty request body received");
      return new Response(JSON.stringify({ error: "Empty request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // VAPI can send payload in different formats:
    // Format 1: { message: { type: "...", call: {...} } }
    // Format 2: Direct payload { type: "...", call: {...} }
    // Format 3: Server URL format where payload itself is the message
    let message = payload.message || payload;
    
    console.log("VAPI Webhook received type:", message?.type);
    console.log("Full payload keys:", Object.keys(payload));
    console.log("Message keys:", message ? Object.keys(message) : "no message");

    // Try multiple locations for assistantId - VAPI sends it in different places
    const assistantId = 
      message?.call?.assistantId || 
      payload.call?.assistantId ||
      message?.assistant?.id ||
      payload.assistant?.id ||
      payload.assistantId ||
      message?.assistantId;

    console.log("Extracted assistantId:", assistantId);

    // Get business_id from assistant_id
    let businessId: string | null = null;
    if (assistantId) {
      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select("id")
        .eq("vapi_assistant_id", assistantId)
        .single();

      if (businessError) {
        console.error("Error fetching business:", businessError);
      }
      businessId = business?.id || null;
    }

    if (!businessId) {
      console.error("Business not found for assistant:", assistantId);
      console.log("Full payload for debugging:", JSON.stringify(payload, null, 2));
      return new Response(JSON.stringify({ 
        error: "Business not found", 
        extractedAssistantId: assistantId,
        payloadKeys: Object.keys(payload),
        messageType: message?.type
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    switch (message.type) {
      case "call-start":
      case "call-started": {
        console.log("Processing call-started event");
        const call = message.call || payload.call;
        const callId = call?.id;
        const callerPhone = call?.customer?.number || call?.phoneNumber?.number || "unknown";
        
        if (!callId) {
          console.error("No call ID found in call-started event");
          return new Response(JSON.stringify({ success: false, error: "No call ID" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if call log already exists
        const { data: existingLog } = await supabase
          .from("call_logs")
          .select("id")
          .eq("vapi_call_id", callId)
          .maybeSingle();

        if (existingLog) {
          console.log("Call log already exists for:", callId);
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: callLog, error } = await supabase
          .from("call_logs")
          .insert({
            business_id: businessId,
            vapi_call_id: callId,
            vapi_assistant_id: assistantId,
            caller_phone: callerPhone,
            started_at: call?.startedAt || new Date().toISOString(),
            vapi_data: call,
          })
          .select()
          .single();

        if (error) {
          console.error("Error creating call log:", error);
        } else {
          console.log("Created call log:", callLog?.id);
        }

        // Try to match existing customer
        if (callLog && callerPhone !== "unknown") {
          const { data: customer } = await supabase
            .from("customers")
            .select("id")
            .eq("business_id", businessId)
            .eq("phone", callerPhone)
            .maybeSingle();

          if (customer) {
            await supabase
              .from("call_logs")
              .update({ customer_id: customer.id })
              .eq("id", callLog.id);
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "call-end":
      case "end-of-call-report": {
        console.log("Processing end-of-call-report event");
        
        // VAPI sends end-of-call-report with different structure
        const call = message.call || payload.call;
        const callId = call?.id;
        
        if (!callId) {
          console.error("No call ID found in end-of-call-report");
          return new Response(JSON.stringify({ success: false, error: "No call ID" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Extract data from the report
        const artifact = message.artifact || {};
        const analysis = message.analysis || {};
        const durationSeconds = call?.endedAt && call?.startedAt
          ? Math.floor((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000)
          : (message.durationSeconds || message.duration || null);

        // Determine outcome
        let outcome: string = "no_action";
        const summary = (artifact.summary || message.summary || "").toLowerCase();
        const successEval = analysis.successEvaluation?.toLowerCase();
        
        if (successEval === "true" || summary.includes("booked") || summary.includes("scheduled")) {
          outcome = "booked";
        } else if (summary.includes("reschedule")) {
          outcome = "rescheduled";
        } else if (summary.includes("cancel")) {
          outcome = "cancelled";
        } else if (summary.includes("question") || summary.includes("inquiry") || summary.includes("info")) {
          outcome = "faq_answered";
        }

        // Check if call log exists, create if not (VAPI might not send call-started)
        const { data: existingLog } = await supabase
          .from("call_logs")
          .select("id")
          .eq("vapi_call_id", callId)
          .maybeSingle();

        if (!existingLog) {
          console.log("Creating call log from end-of-call-report:", callId);
          const callerPhone = call?.customer?.number || call?.phoneNumber?.number || "unknown";
          
          await supabase.from("call_logs").insert({
            business_id: businessId,
            vapi_call_id: callId,
            vapi_assistant_id: assistantId,
            caller_phone: callerPhone,
            started_at: call?.startedAt || new Date().toISOString(),
            ended_at: call?.endedAt || new Date().toISOString(),
            duration_seconds: durationSeconds,
            transcript: artifact.transcript || message.transcript,
            summary: artifact.summary || message.summary,
            recording_url: artifact.recordingUrl || message.recordingUrl,
            outcome: outcome,
            processed_at: new Date().toISOString(),
            vapi_data: { call, artifact, analysis },
          });
        } else {
          // Update existing log
          const { error } = await supabase
            .from("call_logs")
            .update({
              ended_at: call?.endedAt || new Date().toISOString(),
              duration_seconds: durationSeconds,
              transcript: artifact.transcript || message.transcript,
              summary: artifact.summary || message.summary,
              recording_url: artifact.recordingUrl || message.recordingUrl,
              outcome: outcome,
              processed_at: new Date().toISOString(),
              vapi_data: { call, artifact, analysis },
            })
            .eq("vapi_call_id", callId);

          if (error) {
            console.error("Error updating call log:", error);
          } else {
            console.log("Updated call log for:", callId);
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "tool-calls": {
        console.log("Processing tool-calls event");
        
        // VAPI sends toolCalls as an array
        const toolCalls = message.toolCalls || [];
        
        if (toolCalls.length === 0) {
          return new Response(JSON.stringify({ success: true, message: "No tool calls" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Process each tool call and collect results
        const results = [];
        
        for (const toolCall of toolCalls) {
          const functionName = toolCall.function?.name;
          const params = toolCall.function?.arguments
            ? (typeof toolCall.function.arguments === 'string'
                ? JSON.parse(toolCall.function.arguments)
                : toolCall.function.arguments)
            : {};

          console.log(`Processing tool: ${functionName}`, params);

          let result: Record<string, any> = { success: false, message: "Unknown function" };

          switch (functionName) {
            case "book_appointment":
              result = await handleBookAppointment(supabase, businessId, message.call?.id || toolCall.id, params);
              break;
            case "cancel_appointment":
              result = await handleCancelAppointment(supabase, businessId, params);
              break;
            case "reschedule_appointment":
              result = await handleRescheduleAppointment(supabase, businessId, params);
              break;
            case "check_availability":
              result = await handleCheckAvailability(supabase, businessId, params);
              break;
            case "get_business_info":
              result = await getBusinessInfo(supabase, businessId);
              break;
            case "get_services":
              result = await getServices(supabase, businessId, params);
              break;
            default:
              console.log(`Unknown function: ${functionName}`);
              result = { success: false, message: `Unknown function: ${functionName}` };
          }

          results.push({
            toolCallId: toolCall.id,
            result: result,
          });
        }

        // Return results in VAPI's expected format
        return new Response(JSON.stringify({ results }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "function-call": {
        const functionName = message.functionCall!.name;
        const params = message.functionCall!.parameters;

        let result: Record<string, any> = { success: false, message: "Unknown function" };

        switch (functionName) {
          case "book_appointment":
            result = await handleBookAppointment(supabase, businessId, message.call!.id, params);
            break;
          case "cancel_appointment":
            result = await handleCancelAppointment(supabase, businessId, params);
            break;
          case "reschedule_appointment":
            result = await handleRescheduleAppointment(supabase, businessId, params);
            break;
          case "check_availability":
            result = await handleCheckAvailability(supabase, businessId, params);
            break;
          case "get_business_info":
            result = await getBusinessInfo(supabase, businessId);
            break;
          case "get_services":
            result = await getServices(supabase, businessId, params);
            break;
        }

        return new Response(JSON.stringify({ result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "transcript": {
        const { data: callLog } = await supabase
          .from("call_logs")
          .select("id")
          .eq("vapi_call_id", message.call!.id)
          .single();

        if (callLog && message.transcript) {
          await supabase.from("call_messages").insert({
            call_log_id: callLog.id,
            role: message.transcript.role,
            content: message.transcript.content,
            timestamp: message.transcript.timestamp,
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        console.log("Unhandled event type:", message.type);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("VAPI webhook error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Helper functions

async function handleBookAppointment(
  supabase: SupabaseClient<any, any, any>,
  businessId: string,
  callId: string,
  params: Record<string, any>
): Promise<Record<string, any>> {
  try {
    console.log("handleBookAppointment called with params:", params);
    
    // Find or create customer
    let customerId: string;
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id, email")
      .eq("business_id", businessId)
      .eq("phone", params.customer_phone)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      
      // Update customer email if provided and not already set
      if (params.customer_email && !existingCustomer.email) {
        console.log("Updating customer email:", params.customer_email);
        await supabase
          .from("customers")
          .update({ 
            email: params.customer_email,
            address: params.address || undefined,
            updated_at: new Date().toISOString()
          })
          .eq("id", customerId);
      } else if (params.customer_email && existingCustomer.email !== params.customer_email) {
        // Update if email changed
        console.log("Updating customer email from", existingCustomer.email, "to", params.customer_email);
        await supabase
          .from("customers")
          .update({ 
            email: params.customer_email,
            updated_at: new Date().toISOString()
          })
          .eq("id", customerId);
      }
    } else {
      const nameParts = (params.customer_name || "").split(" ");
      const firstName = nameParts[0] || "Unknown";
      const lastName = nameParts.slice(1).join(" ") || null;

      const { data: newCustomer, error: customerError } = await supabase
        .from("customers")
        .insert({
          business_id: businessId,
          first_name: firstName,
          last_name: lastName,
          phone: params.customer_phone,
          email: params.customer_email || null,
          address: params.address,
          source: "ai_call",
        })
        .select()
        .single();

      if (customerError || !newCustomer) {
        console.error("Customer creation error:", customerError);
        return { success: false, message: "Failed to create customer record" };
      }
      customerId = newCustomer.id;
      console.log("Created new customer:", customerId);
    }

    // Find service
    const { data: service } = await supabase
      .from("services")
      .select("id, duration_max")
      .eq("business_id", businessId)
      .ilike("name", `%${params.service_name}%`)
      .maybeSingle();

    // Calculate end time
    const duration = service?.duration_max ?? 60;
    const startTime = params.time as string;
    const [hours, minutes] = startTime.split(":").map(Number);
    const endMinutes = hours * 60 + minutes + duration;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

    // Get call log ID
    const { data: callLog } = await supabase
      .from("call_logs")
      .select("id")
      .eq("vapi_call_id", callId)
      .maybeSingle();

    // Check for existing appointment to prevent duplicates
    const { data: existingAppointment } = await supabase
      .from("appointments")
      .select("id, ref_code")
      .eq("business_id", businessId)
      .eq("customer_id", customerId)
      .eq("scheduled_date", params.date)
      .eq("scheduled_start_time", startTime)
      .neq("status", "cancelled")
      .maybeSingle();

    if (existingAppointment) {
      console.log("Appointment already exists:", existingAppointment.ref_code);
      return {
        success: true,
        message: `You already have an appointment scheduled. Your reference number is ${existingAppointment.ref_code}.`,
        reference_code: existingAppointment.ref_code,
        already_exists: true,
      };
    }

    // Create appointment
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .insert({
        business_id: businessId,
        customer_id: customerId,
        service_id: service?.id || null,
        scheduled_date: params.date,
        scheduled_start_time: startTime,
        scheduled_end_time: endTime,
        status: "pending_confirmation",
        address: params.address,
        customer_notes: params.notes || null,
        source: "ai_call",
        source_call_id: callLog?.id || null,
      })
      .select("id, ref_code")
      .single();

    if (appointmentError || !appointment) {
      console.error("Appointment creation error:", appointmentError);
      return { success: false, message: "Failed to create appointment" };
    }
    
    console.log("Created appointment:", appointment.ref_code);

    // Update call log with outcome
    if (callLog) {
      await supabase
        .from("call_logs")
        .update({
          outcome: "booked",
          appointment_id: appointment.id,
          customer_id: customerId,
        })
        .eq("id", callLog.id);
    }

    // Send "request received" + notify admins (fire and forget)
    supabase.functions.invoke("send-notification", {
      body: { type: "appointment_request_received", appointmentId: appointment.id },
    });
    supabase.functions.invoke("send-notification", {
      body: { type: "admin_new_appointment", appointmentId: appointment.id },
    });

    return {
      success: true,
      message: `Appointment booked successfully! Your reference number is ${appointment.ref_code}. You will receive an email shortly.`,
      reference_code: appointment.ref_code,
    };
  } catch (error) {
    console.error("Book appointment error:", error);
    return { success: false, message: "An error occurred while booking the appointment" };
  }
}

async function handleCancelAppointment(
  supabase: SupabaseClient<any, any, any>,
  businessId: string,
  params: Record<string, any>
): Promise<Record<string, any>> {
  try {
    let query = supabase
      .from("appointments")
      .select("id, ref_code")
      .eq("business_id", businessId)
      .neq("status", "cancelled");

    if (params.reference_code) {
      query = query.eq("ref_code", (params.reference_code as string).toUpperCase());
    } else if (params.customer_phone) {
      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("business_id", businessId)
        .eq("phone", params.customer_phone)
        .single();

      if (!customer) {
        return { success: false, message: "No appointment found for that phone number" };
      }

      query = query.eq("customer_id", customer.id).order("scheduled_date", { ascending: true }).limit(1);
    } else {
      return { success: false, message: "Please provide a reference code or phone number" };
    }

    const { data: appointment, error } = await query.single();

    if (error || !appointment) {
      return { success: false, message: "Appointment not found" };
    }

    await supabase
      .from("appointments")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: "Cancelled via phone",
      })
      .eq("id", appointment.id);

    supabase.functions.invoke("send-notification", {
      body: { type: "appointment_cancelled", appointmentId: appointment.id },
    });

    return {
      success: true,
      message: `Your appointment ${appointment.ref_code} has been cancelled.`,
    };
  } catch (error) {
    console.error("Cancel appointment error:", error);
    return { success: false, message: "An error occurred while cancelling the appointment" };
  }
}

async function handleRescheduleAppointment(
  supabase: SupabaseClient<any, any, any>,
  businessId: string,
  params: Record<string, any>
): Promise<Record<string, any>> {
  try {
    let query = supabase
      .from("appointments")
      .select("id, ref_code, scheduled_start_time, scheduled_end_time, scheduled_date")
      .eq("business_id", businessId)
      .in("status", ["pending_confirmation", "scheduled"]);

    if (params.reference_code) {
      query = query.eq("ref_code", (params.reference_code as string).toUpperCase());
    } else if (params.customer_phone) {
      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("business_id", businessId)
        .eq("phone", params.customer_phone)
        .single();

      if (!customer) {
        return { success: false, message: "No appointment found for that phone number" };
      }

      query = query.eq("customer_id", customer.id).order("scheduled_date", { ascending: true }).limit(1);
    } else {
      return { success: false, message: "Please provide a reference code or phone number" };
    }

    const { data: appointment, error } = await query.single();

    if (error || !appointment) {
      return { success: false, message: "Appointment not found or cannot be rescheduled" };
    }

    // Calculate duration from existing appointment
    const startTime = appointment.scheduled_start_time as string;
    const endTimeStr = appointment.scheduled_end_time as string;
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTimeStr.split(":").map(Number);
    const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);

    // Calculate new end time
    const newTimeStr = params.new_time as string;
    const [newH, newM] = newTimeStr.split(":").map(Number);
    const newEndMinutes = newH * 60 + newM + durationMinutes;
    const newEndTime = `${String(Math.floor(newEndMinutes / 60)).padStart(2, "0")}:${String(newEndMinutes % 60).padStart(2, "0")}`;

    await supabase
      .from("appointments")
      .update({
        scheduled_date: params.new_date,
        scheduled_start_time: params.new_time,
        scheduled_end_time: newEndTime,
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointment.id);

    await supabase.from("appointment_activity").insert({
      appointment_id: appointment.id,
      action: "rescheduled",
      description: `Rescheduled to ${params.new_date} at ${params.new_time}`,
      old_value: { date: appointment.scheduled_date, time: startTime },
      new_value: { date: params.new_date, time: params.new_time },
    });

    supabase.functions.invoke("send-notification", {
      body: { type: "appointment_rescheduled", appointmentId: appointment.id },
    });

    return {
      success: true,
      message: `Your appointment has been rescheduled to ${params.new_date} at ${params.new_time}.`,
    };
  } catch (error) {
    console.error("Reschedule appointment error:", error);
    return { success: false, message: "An error occurred while rescheduling the appointment" };
  }
}

async function handleCheckAvailability(
  supabase: SupabaseClient<any, any, any>,
  businessId: string,
  params: Record<string, any>
): Promise<Record<string, any>> {
  try {
    // Get service duration if service_name provided
    let duration = 60; // Default 1 hour
    if (params.service_name) {
      const { data: service } = await supabase
        .from("services")
        .select("duration_max")
        .eq("business_id", businessId)
        .ilike("name", `%${params.service_name}%`)
        .single();
      
      if (service?.duration_max) {
        duration = service.duration_max;
      }
    }

    const { data: slots, error } = await supabase.rpc("get_available_slots", {
      p_business_id: businessId,
      p_date: params.date,
      p_duration_minutes: duration,
    });

    if (error) {
      console.error("Availability check error:", error);
      return { success: false, message: "Unable to check availability" };
    }

    const slotsArray = slots as any[] || [];
    const availableSlots = slotsArray
      .filter((s) => s.is_available)
      .map((s) => s.slot_time)
      .slice(0, 10);

    if (availableSlots.length === 0) {
      return {
        success: true,
        message: `I'm sorry, we don't have any availability on ${params.date}. Would you like to check another date?`,
        available_slots: [],
      };
    }

    const formattedSlots = availableSlots.map((time: string) => {
      const [h, m] = time.split(":").map(Number);
      const period = h >= 12 ? "PM" : "AM";
      const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
      return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
    });

    return {
      success: true,
      message: `On ${params.date}, we have availability at: ${formattedSlots.join(", ")}. Which time works best for you?`,
      available_slots: availableSlots,
    };
  } catch (error) {
    console.error("Check availability error:", error);
    return { success: false, message: "An error occurred while checking availability" };
  }
}

async function getBusinessInfo(
  supabase: SupabaseClient<any, any, any>,
  businessId: string
): Promise<Record<string, any>> {
  try {
    const { data: business, error } = await supabase
      .from("businesses")
      .select("name, phone, email, address, city, state")
      .eq("id", businessId)
      .single();

    if (error || !business) {
      return { success: false, message: "Business information not available" };
    }

    const { data: hours } = await supabase
      .from("operating_hours")
      .select("day_of_week, is_open, open_time, close_time")
      .eq("business_id", businessId);

    const hoursArray = hours as any[] || [];
    const hoursText = hoursArray
      .filter((h) => h.is_open)
      .map((h) => `${h.day_of_week}: ${h.open_time} to ${h.close_time}`)
      .join(". ");

    return {
      success: true,
      business_name: business.name,
      phone: business.phone,
      email: business.email,
      address: `${business.address || ""}, ${business.city || ""}, ${business.state || ""}`.replace(/^, |, $/g, ""),
      hours: hoursText,
    };
  } catch (error) {
    console.error("Get business info error:", error);
    return { success: false, message: "Unable to retrieve business information" };
  }
}

async function getServices(
  supabase: SupabaseClient<any, any, any>,
  businessId: string,
  params: Record<string, any> = {}
): Promise<Record<string, any>> {
  try {
    let query = supabase
      .from("services")
      .select(`
        name, 
        description, 
        duration_min, 
        duration_max, 
        base_price_min, 
        base_price_max,
        category:service_categories(name)
      `)
      .eq("business_id", businessId)
      .eq("is_active", true);

    // Filter by category if provided
    if (params.category) {
      const { data: category } = await supabase
        .from("service_categories")
        .select("id")
        .eq("business_id", businessId)
        .ilike("name", `%${params.category}%`)
        .single();

      if (category) {
        query = query.eq("category_id", category.id);
      }
    }

    const { data: services, error } = await query.order("sort_order");

    if (error) {
      return { success: false, message: "Unable to retrieve services" };
    }

    const servicesArray = services as any[] || [];
    const serviceList = servicesArray.map((s) => ({
      name: s.name,
      description: s.description,
      category: s.category?.name || "General",
      duration: s.duration_min === s.duration_max
        ? `${s.duration_min} minutes`
        : `${s.duration_min}-${s.duration_max} minutes`,
      price: s.base_price_min && s.base_price_max
        ? `$${s.base_price_min}-$${s.base_price_max}`
        : "Quote on site",
    }));

    return { success: true, services: serviceList };
  } catch (error) {
    console.error("Get services error:", error);
    return { success: false, message: "Unable to retrieve services" };
  }
}
