import { Database } from '@/integrations/supabase/types';

// Base table types
export type Business = Database['public']['Tables']['businesses']['Row'];
export type Customer = Database['public']['Tables']['customers']['Row'];
export type CustomerAddress = Database['public']['Tables']['customer_addresses']['Row'];
export type Appointment = Database['public']['Tables']['appointments']['Row'];
export type Service = Database['public']['Tables']['services']['Row'];
export type ServiceCategory = Database['public']['Tables']['service_categories']['Row'];
export type User = Database['public']['Tables']['users']['Row'];
export type CallLog = Database['public']['Tables']['call_logs']['Row'];
export type CallMessage = Database['public']['Tables']['call_messages']['Row'];
export type Invoice = Database['public']['Tables']['invoices']['Row'];
export type InvoiceItem = Database['public']['Tables']['invoice_items']['Row'];
export type ServiceArea = Database['public']['Tables']['service_areas']['Row'];
export type OperatingHour = Database['public']['Tables']['operating_hours']['Row'];
export type BookingRule = Database['public']['Tables']['booking_rules']['Row'];
export type NotificationSetting = Database['public']['Tables']['notification_settings']['Row'];
export type WidgetConfig = Database['public']['Tables']['widget_config']['Row'];
export type AppointmentActivity = Database['public']['Tables']['appointment_activity']['Row'];
export type NotificationLog = Database['public']['Tables']['notification_log']['Row'];

// Email template types
export type EmailTemplateCategory = 'customer' | 'admin' | 'technician' | 'custom';
export type EmailTemplateRecipientType = 'customer' | 'admin' | 'technician';

export interface EmailTemplate {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  description: string | null;
  category: EmailTemplateCategory;
  trigger_event: string | null;
  recipient_type: EmailTemplateRecipientType;
  subject: string;
  body_html: string;
  body_text: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type EmailTemplateInsert = Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>;
export type EmailTemplateUpdate = Partial<Omit<EmailTemplate, 'id' | 'business_id' | 'created_at'>>;

// Extended types with relations
export type AppointmentWithRelations = Appointment & {
  customer: Customer;
  service: Service | null;
  technician: Pick<User, 'id' | 'first_name' | 'last_name' | 'avatar_url' | 'color'> | null;
  // Extended fields from database that may be returned in queries
  started_at?: string | null;
  completed_at?: string | null;
  time_spent_minutes?: number | null;
  en_route_at?: string | null;
  arrived_at?: string | null;
  work_summary?: string | null;
  technician_notes?: string | null;
};

export type CustomerWithAddresses = Customer & {
  customer_addresses: CustomerAddress[];
};

export type ServiceWithCategory = Service & {
  category: ServiceCategory | null;
};

export type CallLogWithCustomer = CallLog & {
  customer: Customer | null;
};

export type CallLogWithMessages = CallLog & {
  call_messages: CallMessage[];
  customer: Customer | null;
};

export type ServiceAreaWithTechnician = ServiceArea & {
  default_technician: Pick<User, 'id' | 'first_name' | 'last_name' | 'color'> | null;
};

export type InvoiceWithItems = Invoice & {
  invoice_items: InvoiceItem[];
  customer: Customer;
};

// Enum types from the database
export type AppointmentStatus = Database['public']['Enums']['appointment_status'];
export type AppointmentSource = Database['public']['Enums']['appointment_source'];
export type CallOutcome = Database['public']['Enums']['call_outcome'];
export type UserRole = Database['public']['Enums']['user_role'];
export type DayOfWeek = Database['public']['Enums']['day_of_week'];
export type InvoiceStatus = Database['public']['Enums']['invoice_status'];

// Filter types
export interface AppointmentFilters {
  status?: AppointmentStatus;
  dateFrom?: string;
  dateTo?: string;
  technicianId?: string;
  serviceId?: string;
  source?: AppointmentSource;
  /** When true, only appointments with technician_notes containing "[Problem reported]" and status not cancelled/completed */
  hasProblemReported?: boolean;
}

export interface CustomerFilters {
  search?: string;
  sortBy?: 'name' | 'date' | 'appointments' | 'spent';
  sortDirection?: 'asc' | 'desc';
}

export interface CallLogFilters {
  dateFrom?: string;
  dateTo?: string;
  outcome?: CallOutcome;
  hasAppointment?: boolean;
}
