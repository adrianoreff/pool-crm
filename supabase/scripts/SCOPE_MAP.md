# Production operational reset — scope map

## Why SQL (not the app UI)

Cancellation emails are sent only from application code (`useCancelAppointment` → `send-notification` edge function). There are **no database triggers** that email customers on `DELETE` or `TRUNCATE`. Running this script in the Supabase SQL Editor (or `supabase db query --linked`) does **not** send cancellation emails.

## Preserve (required for the app to work)

| Table | Reason |
|-------|--------|
| `businesses` | Tenant / company record |
| `users` | Team members, admin, technicians |
| `auth.users` | Supabase Auth (not touched by this script) |
| `service_categories` | Service catalog structure |
| `services` | Service catalog (per your request) |
| `service_checklists` | Default checklist templates |
| `pool_reading_definitions` | Pool chemistry config |
| `pool_dosage_definitions` | Pool chemistry config |
| `operating_hours` | Booking settings |
| `booking_rules` | Booking settings |
| `technician_availability` | Scheduling config |
| `availability_overrides` | Scheduling config |
| `service_areas` | Service area config |
| `notification_templates` | Email template config |
| `notification_recipients` | Who receives admin emails |
| `notification_settings` | Notification toggles |
| `email_templates` | Custom email HTML config |
| `widget_config` | Booking widget config |
| `user_push_preferences` | Per-user push settings |

## Clear (operational data + logs)

| Table | Notes |
|-------|--------|
| `customers` | All clients |
| `customer_addresses` | Cascades with customers |
| `appointments` | All jobs/visits |
| `appointment_activity`, `appointment_photos`, `appointment_checklist_items` | Per appointment |
| `visit_readings`, `visit_dosages`, `visit_reports` | Pool visit data |
| `job_messages`, `job_chat_read_receipts` | Job chat |
| `routes`, `route_stops`, `route_day_stats` | Route planning |
| `pool_profiles`, `pool_work_orders`, `pool_shopping_items` | Per customer |
| `invoices`, `invoice_items` | Billing history |
| `call_logs`, `call_messages` | AI phone history |
| `notification_log` | Sent notification history |
| `email_logs` | Sent email history |
| `widget_analytics` | Widget usage stats |
| `direct_messages` | Office ↔ tech DMs |
| `team_invitations` | Pending invites (optional clean slate) |
| `push_subscriptions` | Device tokens (re-register on next login) |

## Storage (manual step)

Database rows are removed by SQL; **files remain** in Supabase Storage until cleared:

- Bucket `appointment-photos` — delete objects (folders named by appointment id)
- Bucket `business-logos` — **do not delete** (business branding)

Use Dashboard → Storage, or run the optional storage cleanup section in `README_RESET.md` after the SQL commit.

## Execution files

| File | Purpose |
|------|---------|
| `production_operational_reset.sql` | Main purge + validation |
| `run-production-reset.ps1` | Wrapper: dry-run (`ROLLBACK`) or commit (`COMMIT`) |
