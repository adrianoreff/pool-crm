// TradeFlow CRM Mock Data
// This file contains all mock data for the frontend-only phase

export interface Business {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  logo: string | null;
  businessHours: {
    [key: string]: { open: string; close: string; closed: boolean };
  };
}

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'admin' | 'technician' | 'dispatcher';
  avatar: string | null;
  status: 'available' | 'on_job' | 'off' | 'break';
  color: string;
  specialties: string[];
  joinedAt: string;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  addresses: {
    id: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    isPrimary: boolean;
  }[];
  notes: string;
  createdAt: string;
  totalAppointments: number;
  totalSpent: number;
  lastServiceDate: string | null;
}

export interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Service {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  durationMin: number;
  durationMax: number;
  basePrice: number | null;
  maxPrice: number | null;
  active: boolean;
}

export interface Appointment {
  id: string;
  customerId: string;
  serviceId: string;
  technicianId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'pending_confirmation';
  source: 'ai_call' | 'widget' | 'manual';
  address: string;
  notes: string;
  internalNotes: string;
  photos: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CallLog {
  id: string;
  vapiCallId: string;
  phone: string;
  customerId: string | null;
  customerName: string | null;
  duration: number;
  outcome: 'booked' | 'faq' | 'cancelled' | 'rescheduled' | 'no_action' | 'voicemail';
  transcript: string;
  recordingUrl: string | null;
  appointmentId: string | null;
  extractedInfo: {
    serviceNeeded?: string;
    preferredDate?: string;
    preferredTime?: string;
    addressMentioned?: string;
  };
  createdAt: string;
}

export interface ServiceArea {
  id: string;
  name: string;
  zipCodes: string[];
  assignedTechnicianIds: string[];
  travelSurcharge: number;
  active: boolean;
  color: string;
}

export interface Notification {
  id: string;
  type: 'appointment' | 'team' | 'system' | 'call';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface ActivityItem {
  id: string;
  type: 'appointment_created' | 'appointment_updated' | 'appointment_completed' | 'customer_added' | 'payment_received' | 'call_received';
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  entityId?: string;
  entityType?: 'appointment' | 'customer' | 'payment' | 'call';
}

// Mock Business
export const mockBusiness: Business = {
  id: "bus_1",
  name: "Smith's Plumbing & Electric",
  phone: "+1 (555) 123-4567",
  email: "info@smithsplumbing.com",
  address: "123 Main St, Austin, TX 78701",
  website: "https://smithsplumbing.com",
  logo: null,
  businessHours: {
    monday: { open: "07:00", close: "18:00", closed: false },
    tuesday: { open: "07:00", close: "18:00", closed: false },
    wednesday: { open: "07:00", close: "18:00", closed: false },
    thursday: { open: "07:00", close: "18:00", closed: false },
    friday: { open: "07:00", close: "18:00", closed: false },
    saturday: { open: "08:00", close: "14:00", closed: false },
    sunday: { open: "00:00", close: "00:00", closed: true },
  },
};

// Mock Team Members
export const mockTeam: TeamMember[] = [
  {
    id: "user_1",
    firstName: "John",
    lastName: "Smith",
    email: "john@smithsplumbing.com",
    phone: "+1 (555) 123-4567",
    role: "admin",
    avatar: null,
    status: "available",
    color: "#F97316",
    specialties: ["plumbing", "electrical"],
    joinedAt: "2020-01-15",
  },
  {
    id: "user_2",
    firstName: "Mike",
    lastName: "Johnson",
    email: "mike@smithsplumbing.com",
    phone: "+1 (555) 234-5678",
    role: "technician",
    avatar: null,
    status: "on_job",
    color: "#3B82F6",
    specialties: ["plumbing", "hvac"],
    joinedAt: "2021-03-20",
  },
  {
    id: "user_3",
    firstName: "Sarah",
    lastName: "Williams",
    email: "sarah@smithsplumbing.com",
    phone: "+1 (555) 345-6789",
    role: "dispatcher",
    avatar: null,
    status: "available",
    color: "#8B5CF6",
    specialties: [],
    joinedAt: "2022-06-10",
  },
  {
    id: "user_4",
    firstName: "David",
    lastName: "Brown",
    email: "david@smithsplumbing.com",
    phone: "+1 (555) 456-7890",
    role: "technician",
    avatar: null,
    status: "available",
    color: "#10B981",
    specialties: ["electrical", "handyman"],
    joinedAt: "2021-09-05",
  },
  {
    id: "user_5",
    firstName: "Emily",
    lastName: "Davis",
    email: "emily@smithsplumbing.com",
    phone: "+1 (555) 567-8901",
    role: "technician",
    avatar: null,
    status: "break",
    color: "#EC4899",
    specialties: ["plumbing"],
    joinedAt: "2023-01-15",
  },
];

// Mock Customers
export const mockCustomers: Customer[] = [
  {
    id: "cust_1",
    firstName: "Robert",
    lastName: "Brown",
    phone: "+1 (555) 987-6543",
    email: "robert.brown@email.com",
    addresses: [
      {
        id: "addr_1",
        street: "456 Oak Ave",
        city: "Austin",
        state: "TX",
        zip: "78702",
        isPrimary: true,
      },
    ],
    notes: "Prefers morning appointments. Has a dog.",
    createdAt: "2023-06-15",
    totalAppointments: 8,
    totalSpent: 2450,
    lastServiceDate: "2024-03-10",
  },
  {
    id: "cust_2",
    firstName: "Jennifer",
    lastName: "Martinez",
    phone: "+1 (555) 876-5432",
    email: "jmartinez@email.com",
    addresses: [
      {
        id: "addr_2",
        street: "789 Pine St",
        city: "Austin",
        state: "TX",
        zip: "78703",
        isPrimary: true,
      },
    ],
    notes: "Commercial property - restaurant",
    createdAt: "2023-02-20",
    totalAppointments: 15,
    totalSpent: 5800,
    lastServiceDate: "2024-03-18",
  },
  {
    id: "cust_3",
    firstName: "William",
    lastName: "Garcia",
    phone: "+1 (555) 765-4321",
    email: "wgarcia@email.com",
    addresses: [
      {
        id: "addr_3",
        street: "321 Elm Dr",
        city: "Austin",
        state: "TX",
        zip: "78704",
        isPrimary: true,
      },
      {
        id: "addr_4",
        street: "555 Rental Ave",
        city: "Austin",
        state: "TX",
        zip: "78705",
        isPrimary: false,
      },
    ],
    notes: "Owns multiple rental properties",
    createdAt: "2022-11-10",
    totalAppointments: 22,
    totalSpent: 8900,
    lastServiceDate: "2024-03-15",
  },
  {
    id: "cust_4",
    firstName: "Lisa",
    lastName: "Thompson",
    phone: "+1 (555) 654-3210",
    email: "lisa.t@email.com",
    addresses: [
      {
        id: "addr_5",
        street: "888 Maple Ln",
        city: "Austin",
        state: "TX",
        zip: "78731",
        isPrimary: true,
      },
    ],
    notes: "",
    createdAt: "2024-01-05",
    totalAppointments: 2,
    totalSpent: 450,
    lastServiceDate: "2024-02-28",
  },
  {
    id: "cust_5",
    firstName: "Michael",
    lastName: "Wilson",
    phone: "+1 (555) 543-2109",
    email: "mwilson@email.com",
    addresses: [
      {
        id: "addr_6",
        street: "222 Cedar Blvd",
        city: "Round Rock",
        state: "TX",
        zip: "78664",
        isPrimary: true,
      },
    ],
    notes: "Elderly customer - needs extra time",
    createdAt: "2023-08-22",
    totalAppointments: 5,
    totalSpent: 1200,
    lastServiceDate: "2024-03-01",
  },
  {
    id: "cust_6",
    firstName: "Amanda",
    lastName: "Lee",
    phone: "+1 (555) 432-1098",
    email: "alee@email.com",
    addresses: [
      {
        id: "addr_7",
        street: "444 Birch Way",
        city: "Austin",
        state: "TX",
        zip: "78745",
        isPrimary: true,
      },
    ],
    notes: "Pool service customer",
    createdAt: "2023-04-18",
    totalAppointments: 12,
    totalSpent: 1800,
    lastServiceDate: "2024-03-12",
  },
  {
    id: "cust_7",
    firstName: "Christopher",
    lastName: "Anderson",
    phone: "+1 (555) 321-0987",
    email: "canderson@email.com",
    addresses: [
      {
        id: "addr_8",
        street: "666 Walnut Ct",
        city: "Austin",
        state: "TX",
        zip: "78746",
        isPrimary: true,
      },
    ],
    notes: "High-end property - premium service",
    createdAt: "2022-09-30",
    totalAppointments: 18,
    totalSpent: 12500,
    lastServiceDate: "2024-03-08",
  },
  {
    id: "cust_8",
    firstName: "Jessica",
    lastName: "Taylor",
    phone: "+1 (555) 210-9876",
    email: "jtaylor@email.com",
    addresses: [
      {
        id: "addr_9",
        street: "777 Ash St",
        city: "Pflugerville",
        state: "TX",
        zip: "78660",
        isPrimary: true,
      },
    ],
    notes: "",
    createdAt: "2024-02-14",
    totalAppointments: 1,
    totalSpent: 150,
    lastServiceDate: "2024-02-14",
  },
  {
    id: "cust_9",
    firstName: "Daniel",
    lastName: "Moore",
    phone: "+1 (555) 109-8765",
    email: "dmoore@email.com",
    addresses: [
      {
        id: "addr_10",
        street: "999 Spruce Ave",
        city: "Austin",
        state: "TX",
        zip: "78748",
        isPrimary: true,
      },
    ],
    notes: "Requires 24hr notice for appointments",
    createdAt: "2023-07-09",
    totalAppointments: 7,
    totalSpent: 2100,
    lastServiceDate: "2024-03-05",
  },
  {
    id: "cust_10",
    firstName: "Michelle",
    lastName: "Jackson",
    phone: "+1 (555) 098-7654",
    email: "mjackson@email.com",
    addresses: [
      {
        id: "addr_11",
        street: "111 Poplar Dr",
        city: "Austin",
        state: "TX",
        zip: "78749",
        isPrimary: true,
      },
    ],
    notes: "New construction project",
    createdAt: "2024-03-01",
    totalAppointments: 3,
    totalSpent: 4500,
    lastServiceDate: "2024-03-19",
  },
];

// Service Categories
export const mockServiceCategories: ServiceCategory[] = [
  { id: "cat_1", name: "Plumbing", icon: "Droplets", color: "#3B82F6" },
  { id: "cat_2", name: "Electrical", icon: "Zap", color: "#EAB308" },
  { id: "cat_3", name: "HVAC", icon: "Thermometer", color: "#10B981" },
  { id: "cat_4", name: "Roofing", icon: "Home", color: "#8B5CF6" },
  { id: "cat_5", name: "Pool Cleaning", icon: "Waves", color: "#06B6D4" },
  { id: "cat_6", name: "Handyman", icon: "Wrench", color: "#F97316" },
];

// Mock Services
export const mockServices: Service[] = [
  // Plumbing
  { id: "svc_1", categoryId: "cat_1", name: "Leak Repair", description: "Fix water leaks in pipes, faucets, or fixtures", durationMin: 60, durationMax: 120, basePrice: 75, maxPrice: 150, active: true },
  { id: "svc_2", categoryId: "cat_1", name: "Drain Cleaning", description: "Clear clogged drains and pipes", durationMin: 45, durationMax: 90, basePrice: 85, maxPrice: 175, active: true },
  { id: "svc_3", categoryId: "cat_1", name: "Water Heater Installation", description: "Install new water heater unit", durationMin: 180, durationMax: 300, basePrice: 200, maxPrice: 500, active: true },
  { id: "svc_4", categoryId: "cat_1", name: "Toilet Repair/Replace", description: "Repair or replace toilet fixtures", durationMin: 60, durationMax: 180, basePrice: 100, maxPrice: 350, active: true },
  { id: "svc_5", categoryId: "cat_1", name: "Pipe Replacement", description: "Replace damaged or old pipes", durationMin: 120, durationMax: 480, basePrice: 300, maxPrice: 2000, active: true },
  
  // Electrical
  { id: "svc_6", categoryId: "cat_2", name: "Outlet Installation", description: "Install new electrical outlets", durationMin: 30, durationMax: 60, basePrice: 50, maxPrice: 100, active: true },
  { id: "svc_7", categoryId: "cat_2", name: "Ceiling Fan Installation", description: "Install ceiling fan with wiring", durationMin: 60, durationMax: 120, basePrice: 100, maxPrice: 200, active: true },
  { id: "svc_8", categoryId: "cat_2", name: "Panel Upgrade", description: "Upgrade electrical panel capacity", durationMin: 240, durationMax: 480, basePrice: 800, maxPrice: 2500, active: true },
  { id: "svc_9", categoryId: "cat_2", name: "Light Fixture Installation", description: "Install indoor/outdoor lighting", durationMin: 30, durationMax: 90, basePrice: 60, maxPrice: 150, active: true },
  { id: "svc_10", categoryId: "cat_2", name: "Electrical Troubleshooting", description: "Diagnose and fix electrical issues", durationMin: 60, durationMax: 180, basePrice: 75, maxPrice: 250, active: true },
  
  // HVAC
  { id: "svc_11", categoryId: "cat_3", name: "AC Repair", description: "Diagnose and repair AC units", durationMin: 60, durationMax: 180, basePrice: 100, maxPrice: 400, active: true },
  { id: "svc_12", categoryId: "cat_3", name: "HVAC Maintenance", description: "Routine maintenance and tune-up", durationMin: 60, durationMax: 90, basePrice: 80, maxPrice: 150, active: true },
  { id: "svc_13", categoryId: "cat_3", name: "Thermostat Installation", description: "Install smart or standard thermostat", durationMin: 30, durationMax: 60, basePrice: 50, maxPrice: 100, active: true },
  
  // Roofing
  { id: "svc_14", categoryId: "cat_4", name: "Roof Inspection", description: "Complete roof condition assessment", durationMin: 60, durationMax: 120, basePrice: 100, maxPrice: 200, active: true },
  { id: "svc_15", categoryId: "cat_4", name: "Shingle Repair", description: "Replace damaged shingles", durationMin: 120, durationMax: 300, basePrice: 200, maxPrice: 800, active: true },
  { id: "svc_16", categoryId: "cat_4", name: "Gutter Cleaning", description: "Clean and clear gutters", durationMin: 60, durationMax: 120, basePrice: 75, maxPrice: 150, active: true },
  
  // Pool Cleaning
  { id: "svc_17", categoryId: "cat_5", name: "Weekly Pool Service", description: "Regular pool maintenance", durationMin: 30, durationMax: 60, basePrice: 40, maxPrice: 80, active: true },
  { id: "svc_18", categoryId: "cat_5", name: "Pool Equipment Repair", description: "Repair pumps, filters, heaters", durationMin: 60, durationMax: 180, basePrice: 100, maxPrice: 400, active: true },
  { id: "svc_19", categoryId: "cat_5", name: "Pool Opening/Closing", description: "Seasonal pool preparation", durationMin: 90, durationMax: 180, basePrice: 150, maxPrice: 300, active: true },
  
  // Handyman
  { id: "svc_20", categoryId: "cat_6", name: "General Repair", description: "Various small repairs and fixes", durationMin: 60, durationMax: 120, basePrice: 75, maxPrice: 150, active: true },
  { id: "svc_21", categoryId: "cat_6", name: "Furniture Assembly", description: "Assemble furniture items", durationMin: 60, durationMax: 180, basePrice: 60, maxPrice: 150, active: true },
  { id: "svc_22", categoryId: "cat_6", name: "TV Mounting", description: "Mount TV on wall with cable management", durationMin: 45, durationMax: 90, basePrice: 80, maxPrice: 150, active: true },
  { id: "svc_23", categoryId: "cat_6", name: "Drywall Repair", description: "Patch and repair drywall", durationMin: 60, durationMax: 180, basePrice: 100, maxPrice: 300, active: true },
];

// Get today and next few days for realistic mock data
const today = new Date();
const formatDate = (date: Date) => date.toISOString().split('T')[0];
const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Mock Appointments
export const mockAppointments: Appointment[] = [
  // Today's appointments
  {
    id: "apt_1",
    customerId: "cust_1",
    serviceId: "svc_1",
    technicianId: "user_2",
    date: formatDate(today),
    startTime: "09:00",
    endTime: "11:00",
    status: "in_progress",
    source: "ai_call",
    address: "456 Oak Ave, Austin, TX 78702",
    notes: "Kitchen sink leak - under cabinet",
    internalNotes: "Bring extra pipe fittings",
    photos: [],
    createdAt: formatDate(addDays(today, -2)) + "T10:30:00Z",
    updatedAt: formatDate(today) + "T09:05:00Z",
  },
  {
    id: "apt_2",
    customerId: "cust_2",
    serviceId: "svc_6",
    technicianId: "user_4",
    date: formatDate(today),
    startTime: "10:00",
    endTime: "11:00",
    status: "scheduled",
    source: "widget",
    address: "789 Pine St, Austin, TX 78703",
    notes: "Add 2 outlets in kitchen area",
    internalNotes: "",
    photos: [],
    createdAt: formatDate(addDays(today, -1)) + "T14:20:00Z",
    updatedAt: formatDate(addDays(today, -1)) + "T14:20:00Z",
  },
  {
    id: "apt_3",
    customerId: "cust_3",
    serviceId: "svc_11",
    technicianId: "user_2",
    date: formatDate(today),
    startTime: "13:00",
    endTime: "15:00",
    status: "scheduled",
    source: "manual",
    address: "321 Elm Dr, Austin, TX 78704",
    notes: "AC not cooling properly",
    internalNotes: "Check refrigerant levels",
    photos: [],
    createdAt: formatDate(addDays(today, -3)) + "T09:15:00Z",
    updatedAt: formatDate(addDays(today, -3)) + "T09:15:00Z",
  },
  {
    id: "apt_4",
    customerId: "cust_4",
    serviceId: "svc_2",
    technicianId: "user_5",
    date: formatDate(today),
    startTime: "14:00",
    endTime: "15:30",
    status: "scheduled",
    source: "ai_call",
    address: "888 Maple Ln, Austin, TX 78731",
    notes: "Bathroom drain clogged",
    internalNotes: "",
    photos: [],
    createdAt: formatDate(addDays(today, -1)) + "T16:45:00Z",
    updatedAt: formatDate(addDays(today, -1)) + "T16:45:00Z",
  },
  {
    id: "apt_5",
    customerId: "cust_5",
    serviceId: "svc_20",
    technicianId: "user_4",
    date: formatDate(today),
    startTime: "15:00",
    endTime: "17:00",
    status: "pending_confirmation",
    source: "ai_call",
    address: "222 Cedar Blvd, Round Rock, TX 78664",
    notes: "Multiple small repairs needed",
    internalNotes: "Customer needs callback to confirm scope",
    photos: [],
    createdAt: formatDate(today) + "T08:30:00Z",
    updatedAt: formatDate(today) + "T08:30:00Z",
  },
  // Tomorrow's appointments
  {
    id: "apt_6",
    customerId: "cust_6",
    serviceId: "svc_17",
    technicianId: "user_5",
    date: formatDate(addDays(today, 1)),
    startTime: "08:00",
    endTime: "09:00",
    status: "scheduled",
    source: "manual",
    address: "444 Birch Way, Austin, TX 78745",
    notes: "Weekly pool service",
    internalNotes: "",
    photos: [],
    createdAt: formatDate(addDays(today, -7)) + "T11:00:00Z",
    updatedAt: formatDate(addDays(today, -7)) + "T11:00:00Z",
  },
  {
    id: "apt_7",
    customerId: "cust_7",
    serviceId: "svc_3",
    technicianId: "user_2",
    date: formatDate(addDays(today, 1)),
    startTime: "09:00",
    endTime: "14:00",
    status: "scheduled",
    source: "widget",
    address: "666 Walnut Ct, Austin, TX 78746",
    notes: "Tankless water heater installation",
    internalNotes: "Premium customer - high-end unit requested",
    photos: [],
    createdAt: formatDate(addDays(today, -5)) + "T13:30:00Z",
    updatedAt: formatDate(addDays(today, -5)) + "T13:30:00Z",
  },
  {
    id: "apt_8",
    customerId: "cust_8",
    serviceId: "svc_9",
    technicianId: "user_4",
    date: formatDate(addDays(today, 1)),
    startTime: "10:00",
    endTime: "11:30",
    status: "pending_confirmation",
    source: "ai_call",
    address: "777 Ash St, Pflugerville, TX 78660",
    notes: "Install 3 outdoor lights",
    internalNotes: "",
    photos: [],
    createdAt: formatDate(today) + "T07:15:00Z",
    updatedAt: formatDate(today) + "T07:15:00Z",
  },
  // This week
  {
    id: "apt_9",
    customerId: "cust_9",
    serviceId: "svc_14",
    technicianId: "user_2",
    date: formatDate(addDays(today, 2)),
    startTime: "08:00",
    endTime: "10:00",
    status: "scheduled",
    source: "manual",
    address: "999 Spruce Ave, Austin, TX 78748",
    notes: "Annual roof inspection",
    internalNotes: "",
    photos: [],
    createdAt: formatDate(addDays(today, -4)) + "T10:00:00Z",
    updatedAt: formatDate(addDays(today, -4)) + "T10:00:00Z",
  },
  {
    id: "apt_10",
    customerId: "cust_10",
    serviceId: "svc_8",
    technicianId: "user_4",
    date: formatDate(addDays(today, 3)),
    startTime: "08:00",
    endTime: "16:00",
    status: "scheduled",
    source: "widget",
    address: "111 Poplar Dr, Austin, TX 78749",
    notes: "200 amp panel upgrade",
    internalNotes: "New construction - coordinate with GC",
    photos: [],
    createdAt: formatDate(addDays(today, -10)) + "T15:45:00Z",
    updatedAt: formatDate(addDays(today, -10)) + "T15:45:00Z",
  },
  // Completed
  {
    id: "apt_11",
    customerId: "cust_1",
    serviceId: "svc_4",
    technicianId: "user_2",
    date: formatDate(addDays(today, -1)),
    startTime: "14:00",
    endTime: "16:00",
    status: "completed",
    source: "ai_call",
    address: "456 Oak Ave, Austin, TX 78702",
    notes: "Replace toilet in master bath",
    internalNotes: "Customer very happy with work",
    photos: [],
    createdAt: formatDate(addDays(today, -4)) + "T11:30:00Z",
    updatedAt: formatDate(addDays(today, -1)) + "T16:15:00Z",
  },
  {
    id: "apt_12",
    customerId: "cust_3",
    serviceId: "svc_7",
    technicianId: "user_4",
    date: formatDate(addDays(today, -2)),
    startTime: "10:00",
    endTime: "12:00",
    status: "completed",
    source: "widget",
    address: "555 Rental Ave, Austin, TX 78705",
    notes: "Install ceiling fan in bedroom",
    internalNotes: "",
    photos: [],
    createdAt: formatDate(addDays(today, -6)) + "T09:00:00Z",
    updatedAt: formatDate(addDays(today, -2)) + "T12:10:00Z",
  },
  // Cancelled
  {
    id: "apt_13",
    customerId: "cust_2",
    serviceId: "svc_12",
    technicianId: "user_2",
    date: formatDate(addDays(today, -1)),
    startTime: "09:00",
    endTime: "10:30",
    status: "cancelled",
    source: "manual",
    address: "789 Pine St, Austin, TX 78703",
    notes: "HVAC maintenance",
    internalNotes: "Customer cancelled - rescheduling next week",
    photos: [],
    createdAt: formatDate(addDays(today, -5)) + "T14:00:00Z",
    updatedAt: formatDate(addDays(today, -2)) + "T10:00:00Z",
  },
];

// Mock Call Logs
export const mockCallLogs: CallLog[] = [
  {
    id: "call_1",
    vapiCallId: "vapi_abc123",
    phone: "+1 (555) 987-6543",
    customerId: "cust_1",
    customerName: "Robert Brown",
    duration: 180,
    outcome: "booked",
    transcript: "AI: Hello, this is Smith's Plumbing and Electric. How can I help you today?\n\nCustomer: Hi, I have a leak under my kitchen sink.\n\nAI: I'm sorry to hear that. I can help you schedule a service call. Can you tell me a bit more about the leak?\n\nCustomer: It's been dripping for a couple days now. Getting worse.\n\nAI: I understand. Let me get you scheduled as soon as possible. Are you available tomorrow morning around 9 AM?\n\nCustomer: Yes, that works perfectly.\n\nAI: Great! I've scheduled a leak repair service for tomorrow at 9 AM. One of our technicians will be there. Is there anything else I can help with?\n\nCustomer: No, that's it. Thank you!",
    recordingUrl: null,
    appointmentId: "apt_1",
    extractedInfo: {
      serviceNeeded: "Leak Repair",
      preferredDate: formatDate(today),
      preferredTime: "9:00 AM",
      addressMentioned: "456 Oak Ave",
    },
    createdAt: formatDate(addDays(today, -2)) + "T10:30:00Z",
  },
  {
    id: "call_2",
    vapiCallId: "vapi_def456",
    phone: "+1 (555) 888-9999",
    customerId: null,
    customerName: null,
    duration: 45,
    outcome: "faq",
    transcript: "AI: Hello, this is Smith's Plumbing and Electric. How can I help you today?\n\nCaller: What are your hours?\n\nAI: We're open Monday through Friday from 7 AM to 6 PM, and Saturday from 8 AM to 2 PM. We're closed on Sundays.\n\nCaller: Thanks, I'll call back later.",
    recordingUrl: null,
    appointmentId: null,
    extractedInfo: {},
    createdAt: formatDate(addDays(today, -1)) + "T11:15:00Z",
  },
  {
    id: "call_3",
    vapiCallId: "vapi_ghi789",
    phone: "+1 (555) 654-3210",
    customerId: "cust_4",
    customerName: "Lisa Thompson",
    duration: 210,
    outcome: "booked",
    transcript: "AI: Hello, this is Smith's Plumbing and Electric. How can I help you today?\n\nCustomer: My bathroom drain is completely clogged. Nothing is going down.\n\nAI: That sounds frustrating. Let me get you scheduled for a drain cleaning service. When would be a good time for you?\n\nCustomer: Can someone come today?\n\nAI: Let me check availability... I have an opening this afternoon at 2 PM. Would that work?\n\nCustomer: Yes, please!\n\nAI: Perfect. I've scheduled a drain cleaning for today at 2 PM at your address on file - 888 Maple Ln. A technician will give you a call when they're on their way.",
    recordingUrl: null,
    appointmentId: "apt_4",
    extractedInfo: {
      serviceNeeded: "Drain Cleaning",
      preferredDate: formatDate(today),
      preferredTime: "2:00 PM",
    },
    createdAt: formatDate(addDays(today, -1)) + "T16:45:00Z",
  },
  {
    id: "call_4",
    vapiCallId: "vapi_jkl012",
    phone: "+1 (555) 543-2109",
    customerId: "cust_5",
    customerName: "Michael Wilson",
    duration: 195,
    outcome: "booked",
    transcript: "AI: Hello, this is Smith's Plumbing and Electric. How can I help you today?\n\nCustomer: I need someone to come out and do some repairs around my house. Nothing major, just a few things that need fixing.\n\nAI: Absolutely, we have handyman services for general repairs. Can you tell me what needs to be fixed?\n\nCustomer: A few door hinges, a squeaky floor, and a cabinet door that won't close right.\n\nAI: I can schedule a general repair visit for you. How does tomorrow afternoon around 3 PM sound?\n\nCustomer: That should be fine, but I might need to confirm. Can I let you know?",
    recordingUrl: null,
    appointmentId: "apt_5",
    extractedInfo: {
      serviceNeeded: "General Repair",
      preferredDate: formatDate(today),
      preferredTime: "3:00 PM",
    },
    createdAt: formatDate(today) + "T08:30:00Z",
  },
  {
    id: "call_5",
    vapiCallId: "vapi_mno345",
    phone: "+1 (555) 210-9876",
    customerId: "cust_8",
    customerName: "Jessica Taylor",
    duration: 165,
    outcome: "booked",
    transcript: "AI: Hello, this is Smith's Plumbing and Electric. How can I help you today?\n\nCustomer: I want to install some outdoor lights in my backyard. Can you do that?\n\nAI: Yes, we offer light fixture installation services. How many lights are you looking to install?\n\nCustomer: About three. Around the patio area.\n\nAI: Perfect. I can schedule an electrician to come out and assess the work. When would be convenient?\n\nCustomer: Tomorrow morning if possible.\n\nAI: I have a 10 AM slot available tomorrow. Would that work?\n\nCustomer: Yes, that's great.",
    recordingUrl: null,
    appointmentId: "apt_8",
    extractedInfo: {
      serviceNeeded: "Light Fixture Installation",
      preferredDate: formatDate(addDays(today, 1)),
      preferredTime: "10:00 AM",
    },
    createdAt: formatDate(today) + "T07:15:00Z",
  },
  {
    id: "call_6",
    vapiCallId: "vapi_pqr678",
    phone: "+1 (555) 777-8888",
    customerId: null,
    customerName: null,
    duration: 30,
    outcome: "voicemail",
    transcript: "AI: Hello, this is Smith's Plumbing and Electric. How can I help you today?\n\n[No response - voicemail detected]",
    recordingUrl: null,
    appointmentId: null,
    extractedInfo: {},
    createdAt: formatDate(today) + "T06:45:00Z",
  },
  {
    id: "call_7",
    vapiCallId: "vapi_stu901",
    phone: "+1 (555) 876-5432",
    customerId: "cust_2",
    customerName: "Jennifer Martinez",
    duration: 120,
    outcome: "cancelled",
    transcript: "AI: Hello, this is Smith's Plumbing and Electric. How can I help you today?\n\nCustomer: Hi, I need to cancel my appointment for tomorrow. Something came up.\n\nAI: I understand. Let me look up your appointment... I see you have an HVAC maintenance scheduled for tomorrow at 9 AM. Would you like to reschedule?\n\nCustomer: Not right now. I'll call back next week.\n\nAI: No problem. I've cancelled your appointment. Just give us a call when you're ready to reschedule.",
    recordingUrl: null,
    appointmentId: "apt_13",
    extractedInfo: {},
    createdAt: formatDate(addDays(today, -2)) + "T10:00:00Z",
  },
];

// Mock Service Areas
export const mockServiceAreas: ServiceArea[] = [
  {
    id: "area_1",
    name: "Downtown Austin",
    zipCodes: ["78701", "78702", "78703", "78704"],
    assignedTechnicianIds: ["user_2", "user_4"],
    travelSurcharge: 0,
    active: true,
    color: "#F97316",
  },
  {
    id: "area_2",
    name: "North Austin",
    zipCodes: ["78731", "78745", "78746", "78748", "78749", "78750", "78757"],
    assignedTechnicianIds: ["user_2", "user_4", "user_5"],
    travelSurcharge: 0,
    active: true,
    color: "#3B82F6",
  },
  {
    id: "area_3",
    name: "Round Rock",
    zipCodes: ["78664", "78665", "78681"],
    assignedTechnicianIds: ["user_5"],
    travelSurcharge: 15,
    active: true,
    color: "#10B981",
  },
  {
    id: "area_4",
    name: "Pflugerville",
    zipCodes: ["78660", "78691"],
    assignedTechnicianIds: ["user_4", "user_5"],
    travelSurcharge: 10,
    active: true,
    color: "#8B5CF6",
  },
];

// Mock Notifications
export const mockNotifications: Notification[] = [
  {
    id: "notif_1",
    type: "appointment",
    title: "New appointment booked",
    message: "Robert Brown booked a leak repair for today at 9 AM",
    read: false,
    createdAt: formatDate(addDays(today, -2)) + "T10:30:00Z",
    link: "/appointments/apt_1",
  },
  {
    id: "notif_2",
    type: "call",
    title: "New AI call received",
    message: "Lisa Thompson called about a clogged drain",
    read: false,
    createdAt: formatDate(addDays(today, -1)) + "T16:45:00Z",
    link: "/calls",
  },
  {
    id: "notif_3",
    type: "appointment",
    title: "Appointment pending confirmation",
    message: "Michael Wilson's appointment needs confirmation",
    read: false,
    createdAt: formatDate(today) + "T08:30:00Z",
    link: "/appointments/apt_5",
  },
  {
    id: "notif_4",
    type: "system",
    title: "Daily summary ready",
    message: "Your daily performance report is available",
    read: true,
    createdAt: formatDate(addDays(today, -1)) + "T18:00:00Z",
    link: "/analytics",
  },
  {
    id: "notif_5",
    type: "team",
    title: "Emily is on break",
    message: "Emily Davis has started her break",
    read: true,
    createdAt: formatDate(today) + "T12:00:00Z",
  },
];

// Mock Activity Feed
export const mockActivityFeed: ActivityItem[] = [
  {
    id: "act_1",
    type: "appointment_updated",
    title: "Appointment started",
    description: "Mike Johnson started the leak repair at 456 Oak Ave",
    timestamp: formatDate(today) + "T09:05:00Z",
    icon: "PlayCircle",
    entityId: "apt_1",
    entityType: "appointment",
  },
  {
    id: "act_2",
    type: "call_received",
    title: "AI call received",
    description: "New call from Jessica Taylor - outdoor lighting",
    timestamp: formatDate(today) + "T07:15:00Z",
    icon: "Phone",
    entityId: "call_5",
    entityType: "call",
  },
  {
    id: "act_3",
    type: "appointment_created",
    title: "Appointment booked via AI",
    description: "Michael Wilson - General repair pending confirmation",
    timestamp: formatDate(today) + "T08:30:00Z",
    icon: "CalendarPlus",
    entityId: "apt_5",
    entityType: "appointment",
  },
  {
    id: "act_4",
    type: "appointment_completed",
    title: "Job completed",
    description: "Mike Johnson completed toilet replacement at 456 Oak Ave",
    timestamp: formatDate(addDays(today, -1)) + "T16:15:00Z",
    icon: "CheckCircle",
    entityId: "apt_11",
    entityType: "appointment",
  },
  {
    id: "act_5",
    type: "payment_received",
    title: "Payment received",
    description: "$285.00 from Robert Brown - Toilet replacement",
    timestamp: formatDate(addDays(today, -1)) + "T16:30:00Z",
    icon: "DollarSign",
    entityType: "payment",
  },
  {
    id: "act_6",
    type: "customer_added",
    title: "New customer",
    description: "Michelle Jackson added via booking widget",
    timestamp: formatDate(addDays(today, -1)) + "T15:45:00Z",
    icon: "UserPlus",
    entityId: "cust_10",
    entityType: "customer",
  },
  {
    id: "act_7",
    type: "appointment_completed",
    title: "Job completed",
    description: "David Brown completed ceiling fan installation",
    timestamp: formatDate(addDays(today, -2)) + "T12:10:00Z",
    icon: "CheckCircle",
    entityId: "apt_12",
    entityType: "appointment",
  },
];

// Helper functions
export const getCustomerById = (id: string): Customer | undefined => 
  mockCustomers.find(c => c.id === id);

export const getTeamMemberById = (id: string): TeamMember | undefined => 
  mockTeam.find(t => t.id === id);

export const getServiceById = (id: string): Service | undefined => 
  mockServices.find(s => s.id === id);

export const getServiceCategoryById = (id: string): ServiceCategory | undefined => 
  mockServiceCategories.find(c => c.id === id);

export const getAppointmentById = (id: string): Appointment | undefined => 
  mockAppointments.find(a => a.id === id);

export const getTodaysAppointments = (): Appointment[] => 
  mockAppointments.filter(a => a.date === formatDate(today));

export const getPendingConfirmationCount = (): number => 
  mockAppointments.filter(a => a.status === 'pending_confirmation').length;

export const getUnreadNotificationsCount = (): number => 
  mockNotifications.filter(n => !n.read).length;
