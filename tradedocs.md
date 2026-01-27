# TradeFlow CRM - Phase 1: Complete Frontend Layout
all tables on supabase 

* appointment_activity
* appointment_photos
* appointments
* availability_overrides
* booking_rules
* businesses
* call_logs
* call_messages
* customer_addresses
* customers
* email_logs
* invoice_items
* invoices
* notification_log
* notification_recipients
* notification_settings
* notification_templates
* operating_hours
* service_areas
* service_categories
* services
* team_invitations
* technician_availability
* users
* widget_analytics
* widget_config

Se quiser, posso converter isso para outro formato (JSON, SQL, Markdown, etc.).


## Project Overview
Build a modern SaaS CRM for trade service businesses (plumbers, electricians, roofers, HVAC, pool cleaning, handyman). This is a multi-tenant application where each business has their own account with team members.

**CRITICAL**: I will use my own Supabase instance, NOT Lovable Cloud. Do not set up any backend yet - this phase is FRONTEND ONLY with mock data.

## Design System

### Brand & Colors
- **Primary/Accent**: Orange #F97316 (energy, trades industry)
- **Primary Hover**: #EA580C
- **Background**: #FFFFFF (main), #F8FAFC (secondary/cards)
- **Sidebar**: #1E293B (dark slate)
- **Text Primary**: #0F172A
- **Text Secondary**: #64748B
- **Success**: #22C55E
- **Warning**: #EAB308
- **Error**: #EF4444
- **Border**: #E2E8F0

### Typography
- **Font Family**: Inter (Google Fonts)
- **Headings**: Semi-bold (600)
- **Body**: Regular (400)
- **Scale**: 12px, 14px, 16px, 18px, 24px, 30px, 36px

### Spacing
- Base unit: 4px
- Common spacings: 8px, 12px, 16px, 24px, 32px, 48px, 64px

### Border Radius
- Small (buttons, inputs): 8px
- Medium (cards): 12px
- Large (modals): 16px

### Shadows
- Card: `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)`
- Elevated: `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)`
- Modal: `0 25px 50px -12px rgba(0,0,0,0.25)`

---

## Application Structure

### Layout Components

#### 1. **App Shell** (`src/components/layout/AppShell.tsx`)
- Fixed sidebar on left (280px width on desktop)
- Collapsible to 80px icon-only mode
- Top header bar with:
  - Hamburger menu (mobile)
  - Search bar (global search)
  - Notification bell with badge
  - User avatar dropdown (Profile, Settings, Logout)
- Main content area with padding

#### 2. **Sidebar** (`src/components/layout/Sidebar.tsx`)
- Logo at top: "TradeFlow" with tool icon (Wrench from lucide-react)
- Business name display (from mock data)
- Navigation sections:

**MAIN**
- Dashboard (LayoutDashboard icon)
- Calendar (Calendar icon)
- Appointments (ClipboardList icon)
- Customers (Users icon)

**OPERATIONS**
- Team (UserCog icon)
- Services (Briefcase icon)
- Service Areas (MapPin icon)

**COMMUNICATION**
- Call Logs (Phone icon) - with badge showing new calls
- Messages (MessageSquare icon)

**BUSINESS**
- Invoices (Receipt icon)
- Analytics (BarChart3 icon)
- Settings (Settings icon)

- Active state: Orange background with white text
- Hover state: Light orange background
- Bottom: User info with role badge

#### 3. **Mobile Navigation**
- Bottom tab bar on mobile (5 main items)
- Hamburger menu for full navigation
- Swipe gestures for switching views

---

## Pages Specification

### Page 1: Dashboard (`/dashboard` or `/`)
**File**: `src/pages/Dashboard.tsx`

**Layout**: Grid-based dashboard with widgets

**Components**:

**A. Welcome Header**
- "Good morning, [Name]" with current date
- Quick action buttons: "New Appointment", "Add Customer"

**B. Stats Cards Row** (4 cards)
1. **Today's Jobs**
   - Large number (e.g., "8")
   - Subtitle: "2 in progress, 6 scheduled"
   - Icon: Calendar (orange)

2. **Pending Requests**
   - Large number with badge if > 0
   - Subtitle: "Awaiting confirmation"
   - Icon: Clock (yellow)

3. **This Week Revenue**
   - Dollar amount (e.g., "$4,250")
   - Percentage change from last week
   - Icon: DollarSign (green)

4. **New Calls Today**
   - Number from VAPI
   - Subtitle: "via AI Assistant"
   - Icon: Phone (orange)

**C. Today's Schedule** (Left column - 60% width)
- Timeline view of today's appointments
- Each appointment card shows:
  - Time (9:00 AM - 11:00 AM)
  - Customer name
  - Service type with icon
  - Address (truncated)
  - Technician avatar + name
  - Status badge (Scheduled/In Progress/Completed)
- Click to expand or navigate to details
- "View Full Calendar" link at bottom

**D. Recent Activity Feed** (Right column - 40% width)
- Chronological list of events:
  - New appointment booked (via AI/widget/manual)
  - Appointment status changed
  - New customer added
  - Payment received
- Each item: Icon, description, timestamp
- Max 10 items, "View All" link

**E. Pending Confirmation Widget**
- List of appointments needing human approval
- Quick actions: Confirm, Reschedule, Contact Customer
- Highlight if urgent (within 24 hours)

**F. Map Preview** (Optional widget)
- Small Mapbox map showing today's appointments
- Pins with technician colors
- "Open Full Map" button

---

### Page 2: Calendar (`/calendar`)
**File**: `src/pages/Calendar.tsx`

**Library**: Use `react-big-calendar` with custom styling

**Features**:

**A. View Toggles**
- Day / Week / Month buttons
- Today button
- Navigation arrows (< >)
- Date picker dropdown

**B. Filter Bar**
- Technician filter (multi-select with avatars)
- Service type filter
- Status filter (All, Scheduled, In Progress, Completed, Cancelled)

**C. Calendar Grid**
- Color-coded by:
  - Technician (each has assigned color)
  - Or by service type (toggle option)
- Time slots: 7 AM to 8 PM
- Show appointment cards with:
  - Customer name
  - Service type icon
  - Duration bar

**D. Drag & Drop**
- Drag appointments to reschedule
- Show confirmation dialog on drop
- Highlight conflicts (same technician, same time)

**E. Click Actions**
- Click appointment → Side panel with details
- Click empty slot → Quick create modal

**F. Side Panel** (when appointment selected)
- Full appointment details
- Customer info
- Actions: Edit, Reschedule, Cancel, Assign Technician
- Activity log for this appointment

---

### Page 3: Appointments (`/appointments`)
**File**: `src/pages/Appointments.tsx`

**Layout**: Table view with filters

**Components**:

**A. Stats Bar**
- Total: X appointments
- Today: X
- This Week: X
- Pending Confirmation: X (highlighted)

**B. Filter/Search Bar**
- Search by customer name, phone, address
- Date range picker
- Status dropdown
- Service type dropdown
- Technician dropdown
- Source filter: AI Call / Widget / Manual

**C. Appointments Table**
| Column | Description |
|--------|-------------|
| Status | Color badge (Scheduled=blue, In Progress=orange, Completed=green, Cancelled=red, Pending=yellow) |
| Date & Time | Formatted date and time range |
| Customer | Name (clickable to customer profile) |
| Service | Service type with icon |
| Address | Street address (truncated) |
| Technician | Avatar + name |
| Source | Phone icon / Globe icon / User icon |
| Actions | Menu: View, Edit, Cancel, Invoice |

**D. Bulk Actions**
- Select multiple → Assign to technician, Export, Delete

**E. Row Expansion**
- Click row to expand inline details
- Shows: Full address, notes, contact info, history

**F. Create Button**
- Floating action button (mobile)
- "+ New Appointment" button (desktop)
- Opens create/edit modal

---

### Page 4: Appointment Detail Modal/Page
**File**: `src/components/appointments/AppointmentDetail.tsx`

**Can be**: Modal (from calendar/table) or Full page (`/appointments/:id`)

**Sections**:

**A. Header**
- Status badge (large)
- Service type + icon
- Date and time
- Edit / Cancel / Invoice buttons

**B. Customer Information Card**
- Name, phone, email
- Address with "Open in Maps" link
- Customer since date
- Total appointments count
- Quick actions: Call, Email, View Profile

**C. Service Details Card**
- Service type
- Estimated duration
- Customer notes/description
- Special instructions

**D. Assignment Card**
- Assigned technician (avatar, name, phone)
- Reassign button with dropdown
- If unassigned: "Assign Technician" prompt

**E. Timeline/Activity Card**
- Chronological events:
  - Appointment created (source: AI Call)
  - Confirmation email sent
  - Technician assigned
  - Status changed to In Progress
  - Photos added
  - Completed
- Each with timestamp

**F. Notes & Photos Card**
- Internal notes (staff only)
- Add note textarea
- Photo gallery (uploaded by technician)
- Add photos button

**G. Invoice Section** (if applicable)
- Link to invoice if created
- "Create Invoice" button if not

---

### Page 5: Customers (`/customers`)
**File**: `src/pages/Customers.tsx`

**Layout**: Searchable table + detail panel

**Components**:

**A. Search & Filter Bar**
- Search by name, phone, email, address
- Sort by: Name, Date Added, Total Appointments

**B. Customers Table**
| Column | Description |
|--------|-------------|
| Customer | Name + avatar (initials if no photo) |
| Contact | Phone (click to call), Email |
| Address | Primary address |
| Appointments | Total count |
| Last Service | Date of last appointment |
| Total Spent | Sum of invoices |
| Actions | View, Edit, Delete |

**C. Customer Detail Panel** (slides in from right)
- Full contact information
- Address(es) - support multiple
- Appointment history
- Invoice history
- Notes
- Communication log
- Edit / Delete buttons

**D. Create Customer Modal**
- Name (first, last)
- Phone (required)
- Email
- Address (with autocomplete using Mapbox)
- Notes

---

### Page 6: Team Management (`/team`)
**File**: `src/pages/Team.tsx`

**Layout**: Card grid + table hybrid

**Components**:

**A. Team Stats**
- Total team members
- Active today
- On jobs right now

**B. Team Member Cards** (grid view option)
- Avatar (large)
- Name
- Role badge (Admin/Technician/Dispatcher)
- Status indicator (Available/On Job/Off)
- Today's job count
- Click to view profile

**C. Team Table** (list view option)
| Column | Description |
|--------|-------------|
| Member | Avatar + Name |
| Role | Badge |
| Status | Indicator |
| Phone | Click to call |
| Today's Jobs | Count |
| This Week | Count |
| Actions | View, Edit, Deactivate |

**D. Invite Team Member Button**
- Opens modal with:
  - Email input
  - Role selection (Admin, Technician, Dispatcher)
  - Send invitation button

**E. Team Member Profile** (slide panel or page)
- Full contact info
- Role & permissions
- Assigned service types
- Work schedule
- Performance stats (jobs completed, ratings)
- Edit / Deactivate buttons

---

### Page 7: Services (`/services`)
**File**: `src/pages/Services.tsx`

**Layout**: Categorized list with management

**Components**:

**A. Service Categories**
- Tabs or accordion:
  - Plumbing
  - Electrical
  - Roofing
  - HVAC
  - Pool Cleaning
  - General Handyman
  - Custom

**B. Services Table** (per category)
| Column | Description |
|--------|-------------|
| Service | Name + icon |
| Description | Short description |
| Est. Duration | e.g., "1-2 hours" |
| Base Price | Optional price range |
| Active | Toggle |
| Actions | Edit, Delete |

**C. Add Service Button**
- Modal with:
  - Category dropdown
  - Service name
  - Description
  - Duration range (min/max)
  - Base price (optional)
  - Icon selection

**D. Category Management**
- Add custom category
- Reorder categories
- Edit category name/icon

---

### Page 8: Service Areas (`/service-areas`)
**File**: `src/pages/ServiceAreas.tsx`

**Layout**: Map-centric with list

**Components**:

**A. Full-Width Mapbox Map**
- Show defined service area polygons
- Color-coded by zone
- Pins for recent appointments

**B. Overlay Panel** (left side)
- List of service areas/zones
- Each zone:
  - Name (e.g., "Downtown", "North County")
  - Zip codes included
  - Assigned technicians
  - Active toggle
- Add new zone button

**C. Zone Editor Modal**
- Zone name
- Add zip codes (comma-separated or search)
- Draw polygon on map (optional)
- Assign default technician(s)
- Set travel surcharge (optional)

---

### Page 9: Call Logs (`/calls`)
**File**: `src/pages/CallLogs.tsx`

**Purpose**: Display all calls handled by VAPI AI

**Components**:

**A. Stats Cards**
- Total Calls (today/this week/this month)
- Avg Call Duration
- Booking Conversion Rate
- Missed Calls (if any)

**B. Calls Table**
| Column | Description |
|--------|-------------|
| Date/Time | When call occurred |
| Caller | Phone number |
| Customer | Matched customer name (or "New") |
| Duration | Call length |
| Outcome | Booked / FAQ / Cancelled / Rescheduled / No Action |
| Recording | Play button (if available) |
| Transcript | View button |
| Actions | Create appointment, Add as customer |

**C. Call Detail Modal**
- Full transcript (AI and customer)
- Call recording player
- Extracted information:
  - Service needed
  - Preferred date/time
  - Address mentioned
- Actions: Create appointment from this call

**D. Filters**
- Date range
- Outcome type
- Has appointment (yes/no)

---

### Page 10: Analytics (`/analytics`)
**File**: `src/pages/Analytics.tsx`

**Layout**: Multi-widget dashboard

**Widgets**:

**A. Date Range Selector**
- Preset: Today, This Week, This Month, This Quarter, Custom
- Compare to previous period toggle

**B. Key Metrics Cards**
- Total Revenue
- Jobs Completed
- New Customers
- Avg Job Value

**C. Revenue Chart** (Line chart)
- Revenue over time
- Compare to previous period

**D. Jobs by Service Type** (Pie/Donut chart)
- Breakdown by category

**E. Jobs by Technician** (Bar chart)
- Horizontal bars
- Jobs completed per technician

**F. Booking Sources** (Pie chart)
- AI Call vs Widget vs Manual

**G. Call Analytics** (from VAPI)
- Calls over time
- Conversion rate trend
- Avg call duration

**H. Customer Acquisition** (Line chart)
- New customers over time

---

### Page 11: Settings (`/settings`)
**File**: `src/pages/Settings.tsx`

**Layout**: Tabbed settings page

**Tabs**:

**A. Business Profile**
- Business name
- Logo upload
- Phone number (display)
- Email
- Address
- Website
- Business hours (per day)

**B. Booking Rules**
- Time slot interval (15/30/60 min)
- Buffer time between appointments
- Advance booking days
- Minimum notice hours
- Same-day/emergency booking toggle
- Cancellation policy text

**C. Notifications**
- Email notifications:
  - New appointment → Admin/Dispatcher
  - Appointment cancelled
  - Daily summary
- Customer emails:
  - Confirmation email toggle
  - Reminder email (1 day before)
  - Reminder email (1 hour before)
  - Follow-up request (after completion)
- Add notification recipients (email list)

**D. Integrations**
- VAPI Status (Connected/Disconnected)
  - Phone number display
  - Assistant ID
  - Test call button
- Resend Status
- Mapbox Status
- (Future: QuickBooks, Stripe)

**E. Widget Settings**
- Widget active toggle
- Button text
- Button position
- Color customization
- Embed code display with copy button

**F. Team & Permissions**
- Role management
- Permission matrix

---

### Page 12: Customer Portal (`/portal/:token` or subdomain)
**File**: `src/pages/CustomerPortal.tsx`

**Purpose**: Customer-facing page to view/manage their appointment

**Components**:

**A. Header**
- Business logo
- Business name

**B. Appointment Card**
- Status badge (large)
- Service type
- Date and time
- Address
- Assigned technician info

**C. Actions**
- Reschedule button → Opens date/time picker
- Cancel button → Confirmation dialog
- Contact business button → Opens contact modal

**D. Appointment History** (if returning customer)
- List of past appointments
- View details of each

---

## Global Components

### 1. **Notification Center** (`src/components/NotificationCenter.tsx`)
- Dropdown from bell icon
- Categorized: All, Appointments, Team, System
- Mark as read
- Mark all as read
- Link to full notifications page

### 2. **Quick Actions Modal** (`src/components/QuickActions.tsx`)
- Keyboard shortcut: Cmd/Ctrl + K
- Search for:
  - Customers
  - Appointments
  - Actions (Create appointment, Add customer)
  - Pages

### 3. **Global Search** (`src/components/GlobalSearch.tsx`)
- Search across customers, appointments
- Recent searches
- Keyboard navigation

### 4. **Toast Notifications**
- Success, error, warning, info variants
- Auto-dismiss
- Action buttons

---

## Mock Data Structure

Create mock data files in `src/data/mockData.ts`:
```typescript
// Business
export const mockBusiness = {
  id: "bus_1",
  name: "Smith's Plumbing & Electric",
  phone: "+1 (555) 123-4567",
  email: "info@smithsplumbing.com",
  address: "123 Main St, Austin, TX 78701",
  logo: null
};

// Users/Team
export const mockTeam = [
  { id: "user_1", name: "John Smith", email: "john@...", role: "admin", avatar: null, status: "available" },
  { id: "user_2", name: "Mike Johnson", email: "mike@...", role: "technician", avatar: null, status: "on_job" },
  { id: "user_3", name: "Sarah Williams", email: "sarah@...", role: "dispatcher", avatar: null, status: "available" },
];

// Customers
export const mockCustomers = [
  { id: "cust_1", firstName: "Robert", lastName: "Brown", phone: "+1 (555) 987-6543", email: "robert@...", address: "456 Oak Ave, Austin, TX 78702" },
  // ... 10+ mock customers
];

// Services
export const mockServices = [
  { id: "svc_1", category: "plumbing", name: "Leak Repair", duration: "1-2 hours", basePrice: "$75-150" },
  { id: "svc_2", category: "plumbing", name: "Water Heater Installation", duration: "3-4 hours", basePrice: "$200-400" },
  { id: "svc_3", category: "electrical", name: "Outlet Installation", duration: "1 hour", basePrice: "$50-100" },
  // ... more services per category
];

// Appointments
export const mockAppointments = [
  {
    id: "apt_1",
    customerId: "cust_1",
    serviceId: "svc_1",
    technicianId: "user_2",
    date: "2024-03-20",
    startTime: "09:00",
    endTime: "11:00",
    status: "scheduled", // scheduled, in_progress, completed, cancelled, pending_confirmation
    source: "ai_call", // ai_call, widget, manual
    address: "456 Oak Ave, Austin, TX 78702",
    notes: "Customer mentioned leak under kitchen sink",
    createdAt: "2024-03-18T10:30:00Z"
  },
  // ... 20+ mock appointments across different dates and statuses
];

// Call Logs
export const mockCallLogs = [
  {
    id: "call_1",
    vapiCallId: "vapi_xxx",
    phone: "+1 (555) 111-2222",
    customerId: "cust_1", // or null if new
    duration: 180, // seconds
    outcome: "booked", // booked, faq, cancelled, rescheduled, no_action
    transcript: "AI: Hello, this is Smith's Plumbing... Customer: Hi, I need...",
    appointmentId: "apt_1", // if created
    createdAt: "2024-03-18T10:00:00Z"
  },
  // ... 15+ mock calls
];
```

---

## Routing Structure
```typescript
// src/App.tsx
<Routes>
  {/* Auth Routes */}
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
  <Route path="/forgot-password" element={<ForgotPassword />} />
  
  {/* Protected Routes (inside AppShell) */}
  <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
    <Route path="/" element={<Navigate to="/dashboard" />} />
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/calendar" element={<Calendar />} />
    <Route path="/appointments" element={<Appointments />} />
    <Route path="/appointments/:id" element={<AppointmentDetail />} />
    <Route path="/customers" element={<Customers />} />
    <Route path="/customers/:id" element={<CustomerDetail />} />
    <Route path="/team" element={<Team />} />
    <Route path="/services" element={<Services />} />
    <Route path="/service-areas" element={<ServiceAreas />} />
    <Route path="/calls" element={<CallLogs />} />
    <Route path="/analytics" element={<Analytics />} />
    <Route path="/settings" element={<Settings />} />
  </Route>
  
  {/* Public Routes */}
  <Route path="/portal/:token" element={<CustomerPortal />} />
  <Route path="/book/:embedCode" element={<BookingWidget />} />
</Routes>
```

---

## Additional Requirements

### Responsive Breakpoints
- Mobile: < 640px (single column, bottom nav)
- Tablet: 640px - 1024px (collapsible sidebar)
- Desktop: > 1024px (full sidebar)

### Accessibility
- All interactive elements keyboard accessible
- Proper ARIA labels
- Color contrast compliance
- Focus indicators

### Loading States
- Skeleton loaders for tables and cards
- Spinner for actions
- Progressive loading for large lists

### Empty States
- Friendly illustrations for empty tables
- Clear call-to-action to add first item

### Error States
- Error boundaries for page crashes
- Inline error messages for forms
- Retry options for failed loads

---

## Files to Create

Create complete, functional components for all pages listed above. Use shadcn/ui components (Button, Card, Table, Dialog, Sheet, Tabs, Badge, Avatar, etc.).

For the map components (Dashboard map preview, Service Areas), create placeholder components that will integrate with Mapbox later:
- `src/components/maps/MapPreview.tsx`
- `src/components/maps/ServiceAreaMap.tsx`

Do NOT implement any backend logic, API calls, or Supabase integration. Use the mock data for all displays.

---

## Success Criteria for Phase 1

✅ All 12 pages render correctly with mock data
✅ Navigation works between all pages
✅ Sidebar collapses/expands properly
✅ Mobile responsive design works
✅ All modals and dialogs open/close
✅ Tables sort and filter (client-side with mock data)
✅ Calendar displays events and allows view switching
✅ Forms validate and show errors
✅ Loading and empty states display correctly
✅ Design matches ServiceTitan-inspired orange theme

# TradeFlow CRM - Phase 2: Complete Database Schema

## Overview
Now that the frontend is complete with mock data, implement the full Supabase database schema for the TradeFlow CRM. This is a multi-tenant SaaS application.

**CRITICAL**: I will use my OWN Supabase instance. Please generate all SQL migrations that I can run manually. Create the schema in proper order respecting foreign key relationships.

---

## Database Architecture

### Multi-Tenancy Model
- Each business is a tenant
- All data tables have a `business_id` foreign key
- RLS policies ensure data isolation between tenants
- Users belong to one business (for now)

---

## Complete SQL Schema

### 1. Extensions & Enums
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom types/enums
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'dispatcher', 'technician');
CREATE TYPE appointment_status AS ENUM ('pending_confirmation', 'scheduled', 'in_progress', 'completed', 'cancelled', 'no_show');
CREATE TYPE appointment_source AS ENUM ('ai_call', 'widget', 'manual', 'phone');
CREATE TYPE call_outcome AS ENUM ('booked', 'rescheduled', 'cancelled', 'faq_answered', 'no_action', 'missed', 'voicemail');
CREATE TYPE service_category AS ENUM ('plumbing', 'electrical', 'roofing', 'hvac', 'pool_cleaning', 'handyman', 'custom');
CREATE TYPE day_of_week AS ENUM ('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday');
CREATE TYPE notification_type AS ENUM ('email', 'sms', 'push');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
```

### 2. Core Tables
```sql
-- Businesses (Tenants)
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE, -- for subdomain/URL
  phone TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'US',
  timezone TEXT DEFAULT 'America/Chicago',
  logo_url TEXT,
  
  -- VAPI Integration
  vapi_assistant_id TEXT,
  vapi_phone_number TEXT,
  vapi_api_key_encrypted TEXT, -- store encrypted
  
  -- Settings
  settings JSONB DEFAULT '{}'::jsonb,
  
  -- Subscription (for future billing)
  subscription_status TEXT DEFAULT 'trial',
  subscription_ends_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for slug lookups
CREATE INDEX idx_businesses_slug ON businesses(slug);

-- Users (Team Members)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  
  role user_role NOT NULL DEFAULT 'technician',
  
  -- Technician-specific
  color TEXT, -- for calendar display
  is_active BOOLEAN DEFAULT true,
  
  -- Preferences
  preferences JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  
  UNIQUE(business_id, email)
);

CREATE INDEX idx_users_business ON users(business_id);
CREATE INDEX idx_users_email ON users(email);

-- Team Invitations
CREATE TABLE team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'technician',
  invited_by UUID REFERENCES users(id),
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(business_id, email)
);
```

### 3. Services & Categories
```sql
-- Service Categories (custom per business)
CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT, -- lucide icon name
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(business_id, slug)
);

CREATE INDEX idx_service_categories_business ON service_categories(business_id);

-- Services
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Duration
  duration_min INTEGER, -- minimum minutes
  duration_max INTEGER, -- maximum minutes
  
  -- Pricing
  base_price_min DECIMAL(10,2),
  base_price_max DECIMAL(10,2),
  
  -- AI Assistant context
  ai_description TEXT, -- description for AI to use when talking to customers
  
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_services_business ON services(business_id);
CREATE INDEX idx_services_category ON services(category_id);
```

### 4. Customers
```sql
-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT NOT NULL,
  
  -- Primary address
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  
  notes TEXT,
  tags TEXT[], -- for categorization
  
  -- Source tracking
  source appointment_source,
  source_call_id UUID, -- reference to call that created this customer
  
  -- Stats (denormalized for performance)
  total_appointments INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  last_appointment_at TIMESTAMPTZ,
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_business ON customers(business_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_search ON customers USING gin(
  to_tsvector('english', coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(phone, ''))
);

-- Customer Additional Addresses
CREATE TABLE customer_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  label TEXT, -- "Home", "Office", etc.
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  
  is_primary BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customer_addresses_customer ON customer_addresses(customer_id);
```

### 5. Appointments
```sql
-- Appointments
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Scheduling
  scheduled_date DATE NOT NULL,
  scheduled_start_time TIME NOT NULL,
  scheduled_end_time TIME NOT NULL,
  
  -- Actual times (filled when completed)
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  
  -- Status
  status appointment_status NOT NULL DEFAULT 'pending_confirmation',
  
  -- Location (can differ from customer's primary address)
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  
  -- Details
  customer_notes TEXT, -- what customer said they need
  internal_notes TEXT, -- staff notes
  
  -- Source tracking
  source appointment_source NOT NULL DEFAULT 'manual',
  source_call_id UUID, -- reference to VAPI call if booked via AI
  
  -- Reference code (human-readable)
  ref_code TEXT UNIQUE,
  
  -- Customer portal token
  portal_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  
  -- Confirmation tracking
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES users(id),
  
  -- Cancellation tracking
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES users(id),
  cancellation_reason TEXT,
  
  -- Invoice reference
  invoice_id UUID, -- will reference invoices table
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appointments_business ON appointments(business_id);
CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_technician ON appointments(technician_id);
CREATE INDEX idx_appointments_date ON appointments(scheduled_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_ref_code ON appointments(ref_code);
CREATE INDEX idx_appointments_portal_token ON appointments(portal_token);

-- Appointment reference code generator
CREATE OR REPLACE FUNCTION generate_appointment_ref_code()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  seq INTEGER;
BEGIN
  -- Get business prefix (first 3 chars of name, uppercase)
  SELECT UPPER(LEFT(name, 3)) INTO prefix FROM businesses WHERE id = NEW.business_id;
  
  -- Get next sequence for this business
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(ref_code FROM '[0-9]+$') AS INTEGER)
  ), 0) + 1 INTO seq
  FROM appointments 
  WHERE business_id = NEW.business_id;
  
  NEW.ref_code := prefix || '-' || LPAD(seq::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_appointment_ref_code
  BEFORE INSERT ON appointments
  FOR EACH ROW
  WHEN (NEW.ref_code IS NULL)
  EXECUTE FUNCTION generate_appointment_ref_code();

-- Appointment Activity Log
CREATE TABLE appointment_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  
  action TEXT NOT NULL, -- 'created', 'status_changed', 'rescheduled', 'note_added', 'photo_added', etc.
  description TEXT,
  
  old_value JSONB,
  new_value JSONB,
  
  performed_by UUID REFERENCES users(id), -- null if system/AI
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appointment_activity ON appointment_activity(appointment_id);

-- Appointment Photos
CREATE TABLE appointment_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appointment_photos ON appointment_photos(appointment_id);
```

### 6. VAPI Call Logs
```sql
-- VAPI Call Logs
CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- VAPI identifiers
  vapi_call_id TEXT UNIQUE NOT NULL,
  vapi_assistant_id TEXT,
  
  -- Caller info
  caller_phone TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL, -- matched customer
  
  -- Call details
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Outcome
  outcome call_outcome,
  
  -- Created appointment/action
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  
  -- Content
  transcript TEXT,
  summary TEXT, -- AI-generated summary
  recording_url TEXT,
  
  -- Extracted data (what AI understood)
  extracted_data JSONB, -- { service_needed, preferred_date, preferred_time, address, etc. }
  
  -- Full VAPI payload
  vapi_data JSONB,
  
  -- Processing status
  processed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_logs_business ON call_logs(business_id);
CREATE INDEX idx_call_logs_vapi_call_id ON call_logs(vapi_call_id);
CREATE INDEX idx_call_logs_caller_phone ON call_logs(caller_phone);
CREATE INDEX idx_call_logs_customer ON call_logs(customer_id);
CREATE INDEX idx_call_logs_started_at ON call_logs(started_at);

-- Call Messages (individual turns in conversation)
CREATE TABLE call_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_log_id UUID NOT NULL REFERENCES call_logs(id) ON DELETE CASCADE,
  
  role TEXT NOT NULL, -- 'assistant', 'user', 'system', 'tool'
  content TEXT,
  
  -- For tool calls
  tool_name TEXT,
  tool_arguments JSONB,
  tool_result JSONB,
  
  timestamp TIMESTAMPTZ NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_messages_call ON call_messages(call_log_id);
```

### 7. Scheduling & Availability
```sql
-- Business Operating Hours
CREATE TABLE operating_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  day_of_week day_of_week NOT NULL,
  
  is_open BOOLEAN DEFAULT true,
  open_time TIME,
  close_time TIME,
  
  UNIQUE(business_id, day_of_week)
);

-- Create default hours for new businesses
CREATE OR REPLACE FUNCTION create_default_operating_hours()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO operating_hours (business_id, day_of_week, is_open, open_time, close_time)
  VALUES
    (NEW.id, 'monday', true, '08:00', '18:00'),
    (NEW.id, 'tuesday', true, '08:00', '18:00'),
    (NEW.id, 'wednesday', true, '08:00', '18:00'),
    (NEW.id, 'thursday', true, '08:00', '18:00'),
    (NEW.id, 'friday', true, '08:00', '18:00'),
    (NEW.id, 'saturday', true, '09:00', '14:00'),
    (NEW.id, 'sunday', false, NULL, NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_business_created_add_hours
  AFTER INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION create_default_operating_hours();

-- Booking Rules
CREATE TABLE booking_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID UNIQUE NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  time_slot_interval INTEGER DEFAULT 30, -- minutes (15, 30, 60)
  buffer_time INTEGER DEFAULT 15, -- minutes between appointments
  advance_booking_days INTEGER DEFAULT 30, -- how far ahead can book
  minimum_notice_hours INTEGER DEFAULT 2, -- how soon can book
  
  allow_same_day BOOLEAN DEFAULT true,
  allow_emergency BOOLEAN DEFAULT true,
  emergency_surcharge DECIMAL(10,2) DEFAULT 0,
  
  cancellation_policy TEXT,
  cancellation_notice_hours INTEGER DEFAULT 24,
  
  -- Auto-confirmation
  auto_confirm BOOLEAN DEFAULT false, -- if true, skip pending_confirmation status
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Technician Availability (for specific overrides)
CREATE TABLE technician_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  date DATE NOT NULL,
  
  is_available BOOLEAN DEFAULT true,
  start_time TIME,
  end_time TIME,
  
  reason TEXT, -- "Vacation", "Training", etc.
  
  UNIQUE(technician_id, date)
);

CREATE INDEX idx_technician_availability ON technician_availability(technician_id, date);

-- Business Date Overrides (holidays, closures)
CREATE TABLE availability_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  date DATE NOT NULL,
  
  is_open BOOLEAN DEFAULT false,
  open_time TIME,
  close_time TIME,
  
  reason TEXT, -- "Holiday", "Special Event", etc.
  
  UNIQUE(business_id, date)
);

CREATE INDEX idx_availability_overrides ON availability_overrides(business_id, date);
```

### 8. Service Areas
```sql
-- Service Areas/Zones
CREATE TABLE service_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  
  -- Zip codes covered
  zip_codes TEXT[] NOT NULL DEFAULT '{}',
  
  -- Optional polygon (GeoJSON)
  geojson JSONB,
  
  -- Default technician for this area
  default_technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Pricing adjustments
  travel_surcharge DECIMAL(10,2) DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_service_areas_business ON service_areas(business_id);
CREATE INDEX idx_service_areas_zip ON service_areas USING gin(zip_codes);
```

### 9. Invoices
```sql
-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  
  -- Reference
  invoice_number TEXT UNIQUE,
  
  -- Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  
  -- Status
  status invoice_status NOT NULL DEFAULT 'draft',
  
  -- Amounts
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Payment
  paid_amount DECIMAL(10,2) DEFAULT 0,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_business ON invoices(business_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_appointment ON invoices(appointment_id);

-- Invoice Line Items
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_invoice_items ON invoice_items(invoice_id);

-- Invoice number generator
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  year_str TEXT;
  seq INTEGER;
BEGIN
  prefix := 'INV';
  year_str := TO_CHAR(NOW(), 'YY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)
  ), 0) + 1 INTO seq
  FROM invoices 
  WHERE business_id = NEW.business_id
  AND invoice_number LIKE prefix || '-' || year_str || '-%';
  
  NEW.invoice_number := prefix || '-' || year_str || '-' || LPAD(seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION generate_invoice_number();

-- Update appointment invoice reference
ALTER TABLE appointments 
  ADD CONSTRAINT fk_appointments_invoice 
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
```

### 10. Notifications & Communication
```sql
-- Notification Templates
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL, -- 'appointment_confirmation', 'appointment_reminder_24h', etc.
  
  -- Email content
  email_subject TEXT,
  email_body TEXT, -- HTML with placeholders like {{customer_name}}, {{appointment_date}}
  
  -- SMS content (for future)
  sms_body TEXT,
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(business_id, name)
);

-- Notification Recipients (for admin notifications)
CREATE TABLE notification_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  email TEXT NOT NULL,
  name TEXT,
  
  -- Which notifications to receive
  notify_new_appointment BOOLEAN DEFAULT true,
  notify_cancellation BOOLEAN DEFAULT true,
  notify_daily_summary BOOLEAN DEFAULT true,
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_recipients ON notification_recipients(business_id);

-- Notification Log (sent notifications)
CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  type notification_type NOT NULL,
  template_name TEXT,
  
  recipient_email TEXT,
  recipient_phone TEXT,
  
  subject TEXT,
  body TEXT,
  
  -- Reference
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  
  -- Status
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- External IDs
  resend_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_log_business ON notification_log(business_id);
CREATE INDEX idx_notification_log_appointment ON notification_log(appointment_id);

-- Business Notification Settings
CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID UNIQUE NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Customer notifications
  send_confirmation BOOLEAN DEFAULT true,
  send_reminder_24h BOOLEAN DEFAULT true,
  send_reminder_1h BOOLEAN DEFAULT true,
  send_followup BOOLEAN DEFAULT true,
  
  -- Admin notifications
  notify_admin_new_appointment BOOLEAN DEFAULT true,
  notify_admin_cancellation BOOLEAN DEFAULT true,
  notify_admin_daily_summary BOOLEAN DEFAULT true,
  
  -- Timing
  followup_delay_hours INTEGER DEFAULT 24, -- hours after completion
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 11. Widget Configuration
```sql
-- Widget Configuration
CREATE TABLE widget_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID UNIQUE NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Embed code
  embed_code TEXT UNIQUE DEFAULT 'wgt_' || encode(gen_random_bytes(12), 'hex'),
  
  is_active BOOLEAN DEFAULT true,
  
  -- Appearance
  button_text TEXT DEFAULT 'Book Now',
  button_position TEXT DEFAULT 'bottom-right', -- bottom-right, bottom-left, etc.
  
  primary_color TEXT DEFAULT '#F97316',
  button_text_color TEXT DEFAULT '#FFFFFF',
  background_color TEXT DEFAULT '#FFFFFF',
  text_color TEXT DEFAULT '#0F172A',
  border_color TEXT DEFAULT '#E2E8F0',
  
  -- Custom CSS (optional)
  custom_css TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Widget Analytics
CREATE TABLE widget_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  event_type TEXT NOT NULL, -- 'widget_opened', 'date_selected', 'booking_started', 'booking_completed', etc.
  
  -- Context
  page_url TEXT,
  user_agent TEXT,
  
  -- Reference
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  
  metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_widget_analytics_business ON widget_analytics(business_id);
CREATE INDEX idx_widget_analytics_created ON widget_analytics(created_at);
```

### 12. RLS Policies
```sql
-- Enable RLS on all tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE operating_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_analytics ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's business_id
CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS UUID AS $$
  SELECT business_id FROM users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function to check if user has role
CREATE OR REPLACE FUNCTION has_role(required_role user_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role >= required_role -- owner > admin > dispatcher > technician
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Businesses
CREATE POLICY "Users can view their own business" ON businesses
  FOR SELECT USING (id = get_user_business_id());

CREATE POLICY "Owners can update their business" ON businesses
  FOR UPDATE USING (id = get_user_business_id() AND has_role('owner'));

-- Users
CREATE POLICY "Users can view team members" ON users
  FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "Admins can insert users" ON users
  FOR INSERT WITH CHECK (business_id = get_user_business_id() AND has_role('admin'));

CREATE POLICY "Admins can update users" ON users
  FOR UPDATE USING (business_id = get_user_business_id() AND has_role('admin'));

CREATE POLICY "Users can update themselves" ON users
  FOR UPDATE USING (id = auth.uid());

-- Customers
CREATE POLICY "Users can view customers" ON customers
  FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "Users can insert customers" ON customers
  FOR INSERT WITH CHECK (business_id = get_user_business_id());

CREATE POLICY "Users can update customers" ON customers
  FOR UPDATE USING (business_id = get_user_business_id());

CREATE POLICY "Admins can delete customers" ON customers
  FOR DELETE USING (business_id = get_user_business_id() AND has_role('admin'));

-- Appointments
CREATE POLICY "Users can view appointments" ON appointments
  FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "Users can insert appointments" ON appointments
  FOR INSERT WITH CHECK (business_id = get_user_business_id());

CREATE POLICY "Users can update appointments" ON appointments
  FOR UPDATE USING (business_id = get_user_business_id());

CREATE POLICY "Admins can delete appointments" ON appointments
  FOR DELETE USING (business_id = get_user_business_id() AND has_role('admin'));

-- Call Logs
CREATE POLICY "Users can view call logs" ON call_logs
  FOR SELECT USING (business_id = get_user_business_id());

-- Services (read by all team, write by admins)
CREATE POLICY "Users can view services" ON services
  FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "Admins can manage services" ON services
  FOR ALL USING (business_id = get_user_business_id() AND has_role('admin'));

-- Service Categories
CREATE POLICY "Users can view categories" ON service_categories
  FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "Admins can manage categories" ON service_categories
  FOR ALL USING (business_id = get_user_business_id() AND has_role('admin'));

-- Operating Hours
CREATE POLICY "Users can view hours" ON operating_hours
  FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "Admins can manage hours" ON operating_hours
  FOR ALL USING (business_id = get_user_business_id() AND has_role('admin'));

-- Booking Rules
CREATE POLICY "Users can view rules" ON booking_rules
  FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "Admins can manage rules" ON booking_rules
  FOR ALL USING (business_id = get_user_business_id() AND has_role('admin'));

-- Widget Config (public read for embedding, admin write)
CREATE POLICY "Public can read active widget config" ON widget_config
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage widget" ON widget_config
  FOR ALL USING (business_id = get_user_business_id() AND has_role('admin'));

-- Widget Analytics (public insert, admin read)
CREATE POLICY "Public can insert analytics" ON widget_analytics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can read analytics" ON widget_analytics
  FOR SELECT USING (business_id = get_user_business_id() AND has_role('admin'));

-- Similar patterns for remaining tables...
-- (Apply same logic: business_id = get_user_business_id() for team access)
-- (Admins for management, users for view, public for specific widget functions)
```

### 13. Database Functions
```sql
-- Get available time slots for a date
CREATE OR REPLACE FUNCTION get_available_slots(
  p_business_id UUID,
  p_date DATE,
  p_duration_minutes INTEGER DEFAULT 60
)
RETURNS TABLE (
  slot_time TIME,
  is_available BOOLEAN,
  technicians_available UUID[]
) AS $$
DECLARE
  v_day_of_week day_of_week;
  v_open_time TIME;
  v_close_time TIME;
  v_slot_interval INTEGER;
  v_buffer INTEGER;
  v_current_slot TIME;
BEGIN
  -- Get day of week
  v_day_of_week := LOWER(TO_CHAR(p_date, 'day'))::day_of_week;
  
  -- Get operating hours
  SELECT open_time, close_time INTO v_open_time, v_close_time
  FROM operating_hours
  WHERE business_id = p_business_id AND day_of_week = v_day_of_week AND is_open = true;
  
  -- Check for date override
  SELECT open_time, close_time INTO v_open_time, v_close_time
  FROM availability_overrides
  WHERE business_id = p_business_id AND date = p_date AND is_open = true;
  
  IF v_open_time IS NULL THEN
    RETURN; -- Business is closed
  END IF;
  
  -- Get booking rules
  SELECT time_slot_interval, buffer_time INTO v_slot_interval, v_buffer
  FROM booking_rules WHERE business_id = p_business_id;
  
  v_slot_interval := COALESCE(v_slot_interval, 30);
  v_buffer := COALESCE(v_buffer, 15);
  
  -- Generate slots
  v_current_slot := v_open_time;
  
  WHILE v_current_slot + (p_duration_minutes || ' minutes')::INTERVAL <= v_close_time LOOP
    RETURN QUERY
    SELECT 
      v_current_slot,
      NOT EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.business_id = p_business_id
        AND a.scheduled_date = p_date
        AND a.status NOT IN ('cancelled')
        AND (
          (a.scheduled_start_time, a.scheduled_end_time) OVERLAPS 
          (v_current_slot, v_current_slot + (p_duration_minutes || ' minutes')::INTERVAL)
        )
      ),
      ARRAY(
        SELECT u.id FROM users u
        WHERE u.business_id = p_business_id
        AND u.role = 'technician'
        AND u.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM appointments a
          WHERE a.technician_id = u.id
          AND a.scheduled_date = p_date
          AND a.status NOT IN ('cancelled')
          AND (
            (a.scheduled_start_time, a.scheduled_end_time + (v_buffer || ' minutes')::INTERVAL) OVERLAPS 
            (v_current_slot, v_current_slot + (p_duration_minutes || ' minutes')::INTERVAL)
          )
        )
      );
    
    v_current_slot := v_current_slot + (v_slot_interval || ' minutes')::INTERVAL;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Update customer stats trigger
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE customers SET
      total_appointments = (
        SELECT COUNT(*) FROM appointments WHERE customer_id = NEW.customer_id
      ),
      last_appointment_at = (
        SELECT MAX(scheduled_date::TIMESTAMP + scheduled_start_time) 
        FROM appointments 
        WHERE customer_id = NEW.customer_id AND status = 'completed'
      ),
      updated_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_appointment_change_update_customer
  AFTER INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_stats();

-- Auto-create default records for new business
CREATE OR REPLACE FUNCTION on_business_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Create booking rules
  INSERT INTO booking_rules (business_id) VALUES (NEW.id);
  
  -- Create notification settings
  INSERT INTO notification_settings (business_id) VALUES (NEW.id);
  
  -- Create widget config
  INSERT INTO widget_config (business_id) VALUES (NEW.id);
  
  -- Create default service categories
  INSERT INTO service_categories (business_id, name, slug, icon, sort_order)
  VALUES
    (NEW.id, 'Plumbing', 'plumbing', 'Droplets', 1),
    (NEW.id, 'Electrical', 'electrical', 'Zap', 2),
    (NEW.id, 'Roofing', 'roofing', 'Home', 3),
    (NEW.id, 'HVAC', 'hvac', 'Wind', 4),
    (NEW.id, 'Pool Cleaning', 'pool-cleaning', 'Waves', 5),
    (NEW.id, 'General Handyman', 'handyman', 'Wrench', 6);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_business_created_setup
  AFTER INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION on_business_created();
```

---

## Integration Notes

### Supabase Types Generation
After running migrations, generate TypeScript types:
```bash
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

### Connect Frontend to Backend
Replace mock data with Supabase queries using the generated types and React Query or SWR for data fetching.

---

## Success Criteria for Phase 2

✅ All tables created with proper relationships
✅ RLS policies working correctly
✅ Triggers and functions operational
✅ Default data created for new businesses
✅ Types generated for TypeScript
✅ Test queries return expected data

", "")}/portal/${appointment.portal_token}`;

    switch (type) {
      case "appointment_confirmation":
        subject = `Appointment Confirmation - ${businessName}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #F97316;">Appointment Confirmed!</h1>
            <p>Hi ${customerName},</p>
            <p>Your appointment has been requested and is pending confirmation. Here are the details:</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Service:</strong> ${serviceName}</p>
              <p><strong>Date:</strong> ${dateFormatted}</p>
              <p><strong>Time:</strong> ${timeFormatted}</p>
              <p><strong>Address:</strong> ${appointment.address}</p>
              <p><strong>Reference:</strong> ${appointment.ref_code}</p>
            </div>

            <p>We will confirm your appointment shortly. You can manage your appointment here:</p>
            <p><a href="${portalUrl}" style="background: #F97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Appointment</a></p>

            <p>If you need to make changes, please call us at ${appointment.business.phone}.</p>
            
            <p>Thank you for choosing ${businessName}!</p>
          </div>
        `;
        break;

      case "appointment_rescheduled":
        subject = `Appointment Rescheduled - ${businessName}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #F97316;">Appointment Rescheduled</h1>
            <p>Hi ${customerName},</p>
            <p>Your appointment has been rescheduled. Here are the new details:</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Service:</strong> ${serviceName}</p>
              <p><strong>New Date:</strong> ${dateFormatted}</p>
              <p><strong>New Time:</strong> ${timeFormatted}</p>
              <p><strong>Address:</strong> ${appointment.address}</p>
              <p><strong>Reference:</strong> ${appointment.ref_code}</p>
            </div>

            <p><a href="${portalUrl}" style="background: #F97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Appointment</a></p>

            <p>Thank you for your flexibility!</p>
            <p>${businessName}</p>
          </div>
        `;
        break;

      case "appointment_cancelled":
        subject = `Appointment Cancelled - ${businessName}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #EF4444;">Appointment Cancelled</h1>
            <p>Hi ${customerName},</p>
            <p>Your appointment has been cancelled as requested.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Cancelled Appointment:</strong></p>
              <p>${serviceName} on ${dateFormatted} at ${timeFormatted}</p>
              <p><strong>Reference:</strong> ${appointment.ref_code}</p>
            </div>

            <p>If you'd like to schedule a new appointment, please call us at ${appointment.business.phone} or visit our website.</p>

            <p>We hope to see you soon!</p>
            <p>${businessName}</p>
          </div>
        `;
        break;

      case "appointment_reminder":
        subject = `Reminder: Your Appointment Tomorrow - ${businessName}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #F97316;">Appointment Reminder</h1>
            <p>Hi ${customerName},</p>
            <p>This is a friendly reminder about your upcoming appointment:</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Service:</strong> ${serviceName}</p>
              <p><strong>Date:</strong> ${dateFormatted}</p>
              <p><strong>Time:</strong> ${timeFormatted}</p>
              <p><strong>Address:</strong> ${appointment.address}</p>
              <p><strong>Technician:</strong> ${technicianName}</p>
            </div>

            <p>Need to reschedule? <a href="${portalUrl}">Click here</a> or call us at ${appointment.business.phone}.</p>

            <p>See you soon!</p>
            <p>${businessName}</p>
          </div>
        `;
        break;

      default:
        return new Response(JSON.stringify({ error: "Unknown notification type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `${businessName} <notifications@yourdomain.com>`, // Replace with your verified domain
      to: appointment.customer.email,
      subject,
      html: htmlContent,
    });

    if (emailError) {
      console.error("Email send error:", emailError);
      throw emailError;
    }

    // Log the notification
    await supabase.from("notification_log").insert({
      business_id: appointment.business_id,
      type: "email",
      template_name: type,
      recipient_email: appointment.customer.email,
      subject,
      body: htmlContent,
      appointment_id: appointmentId,
      customer_id: appointment.customer_id,
      sent_at: new Date().toISOString(),
      resend_id: emailData?.id,
    });

    return new Response(JSON.stringify({ success: true, emailId: emailData?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Send notification error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
```

---

## Function 3: Widget Configuration

**File**: `supabase/functions/widget-config/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    // Get additional config
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
      headers: { "Content-Type": "application/json" },
    });
  }
});
```

---

## Function 4: Widget Availability

**File**: `supabase/functions/widget-availability/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { embedCode, date, serviceId } = await req.json();

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
    const formattedSlots = slots.map((slot: any) => ({
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
      headers: { "Content-Type": "application/json" },
    });
  }
});
```

---

## Supabase Configuration

**File**: `supabase/config.toml` (additions)

```toml
[functions.vapi-webhook]
verify_jwt = false

[functions.send-notification]
verify_jwt = false

[functions.widget-config]
verify_jwt = false

[functions.widget-availability]
verify_jwt = false

[functions.widget-create-appointment]
verify_jwt = false
```

---

## VAPI Assistant Configuration

When setting up your VAPI assistant, use these tool definitions:

```json
{
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "book_appointment",
        "description": "Book a new service appointment for the customer",
        "parameters": {
          "type": "object",
          "properties": {
            "customer_name": {
              "type": "string",
              "description": "Full name of the customer"
            },
            "customer_phone": {
              "type": "string",
              "description": "Customer's phone number"
            },
            "customer_email": {
              "type": "string",
              "description": "Customer's email address (optional)"
            },
            "service_name": {
              "type": "string",
              "description": "Type of service needed (plumbing, electrical, etc.)"
            },
            "date": {
              "type": "string",
              "description": "Appointment date in YYYY-MM-DD format"
            },
            "time": {
              "type": "string",
              "description": "Appointment time in HH:MM format (24-hour)"
            },
            "address": {
              "type": "string",
              "description": "Service address"
            },
            "notes": {
              "type": "string",
              "description": "Additional details about the service needed"
            }
          },
          "required": ["customer_name", "customer_phone", "service_name", "date", "time", "address"]
        }
      }
    },
    {
      "type": "function",
      "function": {
        "name": "cancel_appointment",
        "description": "Cancel an existing appointment",
        "parameters": {
          "type": "object",
          "properties": {
            "reference_code": {
              "type": "string",
              "description": "The appointment reference code (e.g., SMI-00001)"
            },
            "customer_phone": {
              "type": "string",
              "description": "Customer's phone number to look up their appointment"
            }
          }
        }
      }
    },
    {
      "type": "function",
      "function": {
        "name": "reschedule_appointment",
        "description": "Reschedule an existing appointment to a new date/time",
        "parameters": {
          "type": "object",
          "properties": {
            "reference_code": {
              "type": "string",
              "description": "The appointment reference code"
            },
            "customer_phone": {
              "type": "string",
              "description": "Customer's phone number"
            },
            "new_date": {
              "type": "string",
              "description": "New date in YYYY-MM-DD format"
            },
            "new_time": {
              "type": "string",
              "description": "New time in HH:MM format"
            }
          },
          "required": ["new_date", "new_time"]
        }
      }
    },
    {
      "type": "function",
      "function": {
        "name": "check_availability",
        "description": "Check available appointment slots for a specific date",
        "parameters": {
          "type": "object",
          "properties": {
            "date": {
              "type": "string",
              "description": "Date to check in YYYY-MM-DD format"
            },
            "service_name": {
              "type": "string",
              "description": "Type of service (optional, affects duration)"
            }
          },
          "required": ["date"]
        }
      }
    },
    {
      "type": "function",
      "function": {
        "name": "get_business_info",
        "description": "Get information about the business (hours, address, contact)",
        "parameters": {
          "type": "object",
          "properties": {}
        }
      }
    },
    {
      "type": "function",
      "function": {
        "name": "get_services",
        "description": "Get list of services offered by the business",
        "parameters": {
          "type": "object",
          "properties": {}
        }
      }
    }
  ]
}
```

---

## Environment Variables Required

Add these to your Supabase Edge Functions secrets:

```
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

---

## VAPI Webhook URL

After deploying, set your VAPI assistant's server URL to:

```
https://YOUR_PROJECT_ID.supabase.co/functions/v1/vapi-webhook
```

---

## Success Criteria for Phase 3

✅ VAPI webhook receives and processes all call events
✅ Appointments created via AI calls appear in database
✅ Customers auto-matched or created from phone calls
✅ Call transcripts stored and accessible
✅ Email notifications sent via Resend
✅ Widget configuration loads correctly
✅ Availability checking works for widget
✅ All edge functions deploy without errors
✅ RLS policies don't block edge function operations
```

---

# 📋 SUMMARY

You now have **3 comprehensive prompts** to build your TradeFlow CRM:

| Phase | Focus | Key Deliverables |
|-------|-------|------------------|
| **Phase 1** | Frontend Layout | 12 pages, sidebar, all UI components, mock data |
| **Phase 2** | Database Schema | 20+ tables, RLS policies, triggers, functions |
| **Phase 3** | Edge Functions | VAPI webhook, notifications, widget APIs |

## Recommended Order:
1. **Run Phase 1** → Get complete frontend with mock data
2. **Run Phase 2** → Set up your Supabase schema (run SQL manually)
3. **Connect frontend to Supabase** → Replace mock data with real queries
4. **Run Phase 3** → Deploy edge functions
5. **Configure VAPI** → Set webhook URL, test AI calls

## Post-Implementation Tasks:
- Configure your VAPI assistant with the provided tool definitions
- Set up Resend domain verification
- Add Mapbox API key for maps
- Test full flow: AI call → appointment created → email sent

Do you want me to clarify any part of these prompts or add additional details?