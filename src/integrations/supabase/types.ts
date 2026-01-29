export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointment_activity: {
        Row: {
          action: string
          appointment_id: string
          created_at: string | null
          description: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          performed_by: string | null
        }
        Insert: {
          action: string
          appointment_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          performed_by?: string | null
        }
        Update: {
          action?: string
          appointment_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_activity_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_activity_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_checklist_items: {
        Row: {
          appointment_id: string
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          item_id: string
          item_text: string
          notes: string | null
        }
        Insert: {
          appointment_id: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          item_id: string
          item_text: string
          notes?: string | null
        }
        Update: {
          appointment_id?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          item_id?: string
          item_text?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_checklist_items_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_photos: {
        Row: {
          appointment_id: string
          caption: string | null
          id: string
          thumbnail_url: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          appointment_id: string
          caption?: string | null
          id?: string
          thumbnail_url?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          appointment_id?: string
          caption?: string | null
          id?: string
          thumbnail_url?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_photos_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          address: string
          arrived_at: string | null
          business_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          city: string | null
          completed_at: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          customer_id: string
          customer_notes: string | null
          en_route_at: string | null
          id: string
          internal_notes: string | null
          invoice_id: string | null
          latitude: number | null
          longitude: number | null
          portal_token: string | null
          ref_code: string | null
          scheduled_date: string
          scheduled_end_time: string
          scheduled_start_time: string
          service_id: string | null
          source: Database["public"]["Enums"]["appointment_source"]
          source_call_id: string | null
          started_at: string | null
          state: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          technician_id: string | null
          technician_notes: string | null
          time_spent_minutes: number | null
          updated_at: string | null
          work_summary: string | null
          zip_code: string | null
        }
        Insert: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          address: string
          arrived_at?: string | null
          business_id: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          city?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          customer_id: string
          customer_notes?: string | null
          en_route_at?: string | null
          id?: string
          internal_notes?: string | null
          invoice_id?: string | null
          latitude?: number | null
          longitude?: number | null
          portal_token?: string | null
          ref_code?: string | null
          scheduled_date: string
          scheduled_end_time: string
          scheduled_start_time: string
          service_id?: string | null
          source?: Database["public"]["Enums"]["appointment_source"]
          source_call_id?: string | null
          started_at?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          technician_id?: string | null
          technician_notes?: string | null
          time_spent_minutes?: number | null
          updated_at?: string | null
          work_summary?: string | null
          zip_code?: string | null
        }
        Update: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          address?: string
          arrived_at?: string | null
          business_id?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          city?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          customer_id?: string
          customer_notes?: string | null
          en_route_at?: string | null
          id?: string
          internal_notes?: string | null
          invoice_id?: string | null
          latitude?: number | null
          longitude?: number | null
          portal_token?: string | null
          ref_code?: string | null
          scheduled_date?: string
          scheduled_end_time?: string
          scheduled_start_time?: string
          service_id?: string | null
          source?: Database["public"]["Enums"]["appointment_source"]
          source_call_id?: string | null
          started_at?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          technician_id?: string | null
          technician_notes?: string | null
          time_spent_minutes?: number | null
          updated_at?: string | null
          work_summary?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_appointments_invoice"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_overrides: {
        Row: {
          business_id: string
          close_time: string | null
          date: string
          id: string
          is_open: boolean | null
          open_time: string | null
          reason: string | null
        }
        Insert: {
          business_id: string
          close_time?: string | null
          date: string
          id?: string
          is_open?: boolean | null
          open_time?: string | null
          reason?: string | null
        }
        Update: {
          business_id?: string
          close_time?: string | null
          date?: string
          id?: string
          is_open?: boolean | null
          open_time?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_overrides_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_rules: {
        Row: {
          advance_booking_days: number | null
          allow_emergency: boolean | null
          allow_same_day: boolean | null
          auto_confirm: boolean | null
          buffer_time: number | null
          business_id: string
          cancellation_notice_hours: number | null
          cancellation_policy: string | null
          created_at: string | null
          emergency_surcharge: number | null
          id: string
          minimum_notice_hours: number | null
          time_slot_interval: number | null
          updated_at: string | null
        }
        Insert: {
          advance_booking_days?: number | null
          allow_emergency?: boolean | null
          allow_same_day?: boolean | null
          auto_confirm?: boolean | null
          buffer_time?: number | null
          business_id: string
          cancellation_notice_hours?: number | null
          cancellation_policy?: string | null
          created_at?: string | null
          emergency_surcharge?: number | null
          id?: string
          minimum_notice_hours?: number | null
          time_slot_interval?: number | null
          updated_at?: string | null
        }
        Update: {
          advance_booking_days?: number | null
          allow_emergency?: boolean | null
          allow_same_day?: boolean | null
          auto_confirm?: boolean | null
          buffer_time?: number | null
          business_id?: string
          cancellation_notice_hours?: number | null
          cancellation_policy?: string | null
          created_at?: string | null
          emergency_surcharge?: number | null
          id?: string
          minimum_notice_hours?: number | null
          time_slot_interval?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_rules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          logo_url: string | null
          mapbox_public_token: string | null
          name: string
          phone: string | null
          settings: Json | null
          slug: string | null
          state: string | null
          subscription_ends_at: string | null
          subscription_status: string | null
          timezone: string | null
          updated_at: string | null
          vapi_api_key_encrypted: string | null
          vapi_assistant_id: string | null
          vapi_phone_number: string | null
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          mapbox_public_token?: string | null
          name: string
          phone?: string | null
          settings?: Json | null
          slug?: string | null
          state?: string | null
          subscription_ends_at?: string | null
          subscription_status?: string | null
          timezone?: string | null
          updated_at?: string | null
          vapi_api_key_encrypted?: string | null
          vapi_assistant_id?: string | null
          vapi_phone_number?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          mapbox_public_token?: string | null
          name?: string
          phone?: string | null
          settings?: Json | null
          slug?: string | null
          state?: string | null
          subscription_ends_at?: string | null
          subscription_status?: string | null
          timezone?: string | null
          updated_at?: string | null
          vapi_api_key_encrypted?: string | null
          vapi_assistant_id?: string | null
          vapi_phone_number?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          appointment_id: string | null
          business_id: string
          caller_phone: string
          created_at: string | null
          customer_id: string | null
          duration_seconds: number | null
          ended_at: string | null
          extracted_data: Json | null
          id: string
          outcome: Database["public"]["Enums"]["call_outcome"] | null
          processed_at: string | null
          recording_url: string | null
          started_at: string
          summary: string | null
          transcript: string | null
          vapi_assistant_id: string | null
          vapi_call_id: string
          vapi_data: Json | null
        }
        Insert: {
          appointment_id?: string | null
          business_id: string
          caller_phone: string
          created_at?: string | null
          customer_id?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          extracted_data?: Json | null
          id?: string
          outcome?: Database["public"]["Enums"]["call_outcome"] | null
          processed_at?: string | null
          recording_url?: string | null
          started_at: string
          summary?: string | null
          transcript?: string | null
          vapi_assistant_id?: string | null
          vapi_call_id: string
          vapi_data?: Json | null
        }
        Update: {
          appointment_id?: string | null
          business_id?: string
          caller_phone?: string
          created_at?: string | null
          customer_id?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          extracted_data?: Json | null
          id?: string
          outcome?: Database["public"]["Enums"]["call_outcome"] | null
          processed_at?: string | null
          recording_url?: string | null
          started_at?: string
          summary?: string | null
          transcript?: string | null
          vapi_assistant_id?: string | null
          vapi_call_id?: string
          vapi_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      call_messages: {
        Row: {
          call_log_id: string
          content: string | null
          created_at: string | null
          id: string
          role: string
          timestamp: string
          tool_arguments: Json | null
          tool_name: string | null
          tool_result: Json | null
        }
        Insert: {
          call_log_id: string
          content?: string | null
          created_at?: string | null
          id?: string
          role: string
          timestamp: string
          tool_arguments?: Json | null
          tool_name?: string | null
          tool_result?: Json | null
        }
        Update: {
          call_log_id?: string
          content?: string | null
          created_at?: string | null
          id?: string
          role?: string
          timestamp?: string
          tool_arguments?: Json | null
          tool_name?: string | null
          tool_result?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "call_messages_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "call_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address: string
          city: string | null
          created_at: string | null
          customer_id: string
          id: string
          is_primary: boolean | null
          label: string | null
          latitude: number | null
          longitude: number | null
          state: string | null
          zip_code: string | null
        }
        Insert: {
          address: string
          city?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          is_primary?: boolean | null
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          state?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string
          city?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          is_primary?: boolean | null
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          state?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          business_id: string
          city: string | null
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          is_active: boolean | null
          last_appointment_at: string | null
          last_name: string | null
          latitude: number | null
          longitude: number | null
          notes: string | null
          phone: string
          source: Database["public"]["Enums"]["appointment_source"] | null
          source_call_id: string | null
          state: string | null
          tags: string[] | null
          total_appointments: number | null
          total_spent: number | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          business_id: string
          city?: string | null
          created_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_active?: boolean | null
          last_appointment_at?: string | null
          last_name?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          phone: string
          source?: Database["public"]["Enums"]["appointment_source"] | null
          source_call_id?: string | null
          state?: string | null
          tags?: string[] | null
          total_appointments?: number | null
          total_spent?: number | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          business_id?: string
          city?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_appointment_at?: string | null
          last_name?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          phone?: string
          source?: Database["public"]["Enums"]["appointment_source"] | null
          source_call_id?: string | null
          state?: string | null
          tags?: string[] | null
          total_appointments?: number | null
          total_spent?: number | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          appointment_id: string | null
          bounced_at: string | null
          business_id: string
          clicked_at: string | null
          created_at: string | null
          customer_id: string | null
          delivered_at: string | null
          email_type: string
          error_message: string | null
          failed_at: string | null
          id: string
          metadata: Json | null
          opened_at: string | null
          recipient_email: string
          recipient_name: string | null
          recipient_type: string
          resend_id: string | null
          sent_at: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          bounced_at?: string | null
          business_id: string
          clicked_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          email_type: string
          error_message?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient_email: string
          recipient_name?: string | null
          recipient_type: string
          resend_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          bounced_at?: string | null
          business_id?: string
          clicked_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          email_type?: string
          error_message?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient_email?: string
          recipient_name?: string | null
          recipient_type?: string
          resend_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          body_text: string | null
          business_id: string | null
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          recipient_type: string
          slug: string
          subject: string
          trigger_event: string | null
          updated_at: string | null
        }
        Insert: {
          body_html: string
          body_text?: string | null
          business_id?: string | null
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          recipient_type: string
          slug: string
          subject: string
          trigger_event?: string | null
          updated_at?: string | null
        }
        Update: {
          body_html?: string
          body_text?: string | null
          business_id?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          recipient_type?: string
          slug?: string
          subject?: string
          trigger_event?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          description: string
          id: string
          invoice_id: string
          quantity: number
          service_id: string | null
          sort_order: number | null
          total: number
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          service_id?: string | null
          sort_order?: number | null
          total: number
          unit_price: number
        }
        Update: {
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          service_id?: string | null
          sort_order?: number | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          appointment_id: string | null
          business_id: string
          created_at: string | null
          customer_id: string
          discount_amount: number | null
          due_date: string | null
          id: string
          invoice_number: string | null
          issue_date: string
          notes: string | null
          paid_amount: number | null
          paid_at: string | null
          payment_method: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          total: number
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          business_id: string
          created_at?: string | null
          customer_id: string
          discount_amount?: number | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          issue_date?: string
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          business_id?: string
          created_at?: string | null
          customer_id?: string
          discount_amount?: number | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          issue_date?: string
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          appointment_id: string | null
          body: string | null
          business_id: string
          created_at: string | null
          customer_id: string | null
          delivered_at: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          recipient_email: string | null
          recipient_phone: string | null
          resend_id: string | null
          sent_at: string | null
          subject: string | null
          template_name: string | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          appointment_id?: string | null
          body?: string | null
          business_id: string
          created_at?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          recipient_email?: string | null
          recipient_phone?: string | null
          resend_id?: string | null
          sent_at?: string | null
          subject?: string | null
          template_name?: string | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          appointment_id?: string | null
          body?: string | null
          business_id?: string
          created_at?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          recipient_email?: string | null
          recipient_phone?: string | null
          resend_id?: string | null
          sent_at?: string | null
          subject?: string | null
          template_name?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_recipients: {
        Row: {
          business_id: string
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string | null
          notify_cancellation: boolean | null
          notify_daily_summary: boolean | null
          notify_new_appointment: boolean | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          notify_cancellation?: boolean | null
          notify_daily_summary?: boolean | null
          notify_new_appointment?: boolean | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          notify_cancellation?: boolean | null
          notify_daily_summary?: boolean | null
          notify_new_appointment?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_recipients_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          business_id: string
          created_at: string | null
          followup_delay_hours: number | null
          id: string
          notify_admin_cancellation: boolean | null
          notify_admin_daily_summary: boolean | null
          notify_admin_new_appointment: boolean | null
          send_confirmation: boolean | null
          send_followup: boolean | null
          send_reminder_1h: boolean | null
          send_reminder_24h: boolean | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          followup_delay_hours?: number | null
          id?: string
          notify_admin_cancellation?: boolean | null
          notify_admin_daily_summary?: boolean | null
          notify_admin_new_appointment?: boolean | null
          send_confirmation?: boolean | null
          send_followup?: boolean | null
          send_reminder_1h?: boolean | null
          send_reminder_24h?: boolean | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          followup_delay_hours?: number | null
          id?: string
          notify_admin_cancellation?: boolean | null
          notify_admin_daily_summary?: boolean | null
          notify_admin_new_appointment?: boolean | null
          send_confirmation?: boolean | null
          send_followup?: boolean | null
          send_reminder_1h?: boolean | null
          send_reminder_24h?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          business_id: string
          created_at: string | null
          email_body: string | null
          email_subject: string | null
          id: string
          is_active: boolean | null
          name: string
          sms_body: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          email_body?: string | null
          email_subject?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sms_body?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          email_body?: string | null
          email_subject?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sms_body?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      operating_hours: {
        Row: {
          business_id: string
          close_time: string | null
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          id: string
          is_open: boolean | null
          open_time: string | null
        }
        Insert: {
          business_id: string
          close_time?: string | null
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          id?: string
          is_open?: boolean | null
          open_time?: string | null
        }
        Update: {
          business_id?: string
          close_time?: string | null
          day_of_week?: Database["public"]["Enums"]["day_of_week"]
          id?: string
          is_open?: boolean | null
          open_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operating_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      service_areas: {
        Row: {
          business_id: string
          created_at: string | null
          default_technician_id: string | null
          geojson: Json | null
          id: string
          is_active: boolean | null
          name: string
          travel_surcharge: number | null
          updated_at: string | null
          zip_codes: string[]
        }
        Insert: {
          business_id: string
          created_at?: string | null
          default_technician_id?: string | null
          geojson?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          travel_surcharge?: number | null
          updated_at?: string | null
          zip_codes?: string[]
        }
        Update: {
          business_id?: string
          created_at?: string | null
          default_technician_id?: string | null
          geojson?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          travel_surcharge?: number | null
          updated_at?: string | null
          zip_codes?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "service_areas_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_areas_default_technician_id_fkey"
            columns: ["default_technician_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          business_id: string
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      service_checklists: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          items: Json
          name: string
          service_id: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          items?: Json
          name: string
          service_id?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          items?: Json
          name?: string
          service_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_checklists_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_checklists_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          ai_description: string | null
          base_price_max: number | null
          base_price_min: number | null
          business_id: string
          category_id: string | null
          created_at: string | null
          description: string | null
          duration_max: number | null
          duration_min: number | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          ai_description?: string | null
          base_price_max?: number | null
          base_price_min?: number | null
          business_id: string
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_max?: number | null
          duration_min?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          ai_description?: string | null
          base_price_max?: number | null
          base_price_min?: number | null
          business_id?: string
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_max?: number | null
          duration_min?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          business_id: string
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["user_role"]
          token: string | null
        }
        Insert: {
          accepted_at?: string | null
          business_id: string
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          token?: string | null
        }
        Update: {
          accepted_at?: string | null
          business_id?: string
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_availability: {
        Row: {
          date: string
          end_time: string | null
          id: string
          is_available: boolean | null
          reason: string | null
          start_time: string | null
          technician_id: string
        }
        Insert: {
          date: string
          end_time?: string | null
          id?: string
          is_available?: boolean | null
          reason?: string | null
          start_time?: string | null
          technician_id: string
        }
        Update: {
          date?: string
          end_time?: string | null
          id?: string
          is_available?: boolean | null
          reason?: string | null
          start_time?: string | null
          technician_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_availability_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          business_id: string
          color: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          last_seen_at: string | null
          phone: string | null
          preferences: Json | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          business_id: string
          color?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          is_active?: boolean | null
          last_name?: string | null
          last_seen_at?: string | null
          phone?: string | null
          preferences?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          business_id?: string
          color?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          last_seen_at?: string | null
          phone?: string | null
          preferences?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_analytics: {
        Row: {
          appointment_id: string | null
          business_id: string
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          page_url: string | null
          user_agent: string | null
        }
        Insert: {
          appointment_id?: string | null
          business_id: string
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          page_url?: string | null
          user_agent?: string | null
        }
        Update: {
          appointment_id?: string | null
          business_id?: string
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          page_url?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "widget_analytics_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_analytics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_config: {
        Row: {
          background_color: string | null
          border_color: string | null
          business_id: string
          button_position: string | null
          button_text: string | null
          button_text_color: string | null
          created_at: string | null
          custom_css: string | null
          embed_code: string | null
          id: string
          is_active: boolean | null
          primary_color: string | null
          text_color: string | null
          updated_at: string | null
        }
        Insert: {
          background_color?: string | null
          border_color?: string | null
          business_id: string
          button_position?: string | null
          button_text?: string | null
          button_text_color?: string | null
          created_at?: string | null
          custom_css?: string | null
          embed_code?: string | null
          id?: string
          is_active?: boolean | null
          primary_color?: string | null
          text_color?: string | null
          updated_at?: string | null
        }
        Update: {
          background_color?: string | null
          border_color?: string | null
          business_id?: string
          button_position?: string | null
          button_text?: string | null
          button_text_color?: string | null
          created_at?: string | null
          custom_css?: string | null
          embed_code?: string | null
          id?: string
          is_active?: boolean | null
          primary_color?: string | null
          text_color?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "widget_config_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_business_with_owner: {
        Args: {
          p_business_name: string
          p_user_first_name?: string
          p_user_last_name?: string
          p_user_phone?: string
        }
        Returns: string
      }
      get_available_slots: {
        Args: {
          p_business_id: string
          p_date: string
          p_duration_minutes?: number
        }
        Returns: {
          is_available: boolean
          slot_time: string
          technicians_available: string[]
        }[]
      }
      get_user_business_id: { Args: never; Returns: string }
      has_role: {
        Args: { required_role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
    }
    Enums: {
      appointment_source: "ai_call" | "widget" | "manual" | "phone"
      appointment_status:
        | "pending_confirmation"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
      call_outcome:
        | "booked"
        | "rescheduled"
        | "cancelled"
        | "faq_answered"
        | "no_action"
        | "missed"
        | "voicemail"
      day_of_week:
        | "sunday"
        | "monday"
        | "tuesday"
        | "wednesday"
        | "thursday"
        | "friday"
        | "saturday"
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
      notification_type: "email" | "sms" | "push"
      user_role: "owner" | "admin" | "dispatcher" | "technician"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appointment_source: ["ai_call", "widget", "manual", "phone"],
      appointment_status: [
        "pending_confirmation",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
      call_outcome: [
        "booked",
        "rescheduled",
        "cancelled",
        "faq_answered",
        "no_action",
        "missed",
        "voicemail",
      ],
      day_of_week: [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ],
      invoice_status: ["draft", "sent", "paid", "overdue", "cancelled"],
      notification_type: ["email", "sms", "push"],
      user_role: ["owner", "admin", "dispatcher", "technician"],
    },
  },
} as const
