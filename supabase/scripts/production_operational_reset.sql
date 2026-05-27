-- =============================================================================
-- PRODUCTION OPERATIONAL RESET
-- Purges customers, appointments, routes, invoices, calls, and app logs.
-- Does NOT touch: businesses, users, services, pool definitions, booking config.
--
-- Emails: cancellation emails are app-only (useCancelAppointment). This script
-- uses TRUNCATE/DELETE only — no send-notification calls.
--
-- Usage: run via run-production-reset.ps1 (-DryRun or -Commit)
-- =============================================================================

-- Disable row-level triggers during purge (stat triggers on appointments/customers).
-- TRUNCATE does not fire row triggers, but DELETE fallbacks would; we use TRUNCATE only.
SET LOCAL session_replication_role = replica;

-- -----------------------------------------------------------------------------
-- Pre-reset counts (for audit log in query output)
-- -----------------------------------------------------------------------------
SELECT 'BEFORE' AS phase,
  (SELECT COUNT(*) FROM public.customers) AS customers,
  (SELECT COUNT(*) FROM public.appointments) AS appointments,
  (SELECT COUNT(*) FROM public.call_logs) AS call_logs,
  (SELECT COUNT(*) FROM public.invoices) AS invoices,
  (SELECT COUNT(*) FROM public.notification_log) AS notification_log,
  (SELECT COUNT(*) FROM public.email_logs) AS email_logs,
  (SELECT COUNT(*) FROM public.users) AS users,
  (SELECT COUNT(*) FROM public.services) AS services,
  (SELECT COUNT(*) FROM public.businesses) AS businesses;

-- -----------------------------------------------------------------------------
-- 1) Appointment-attached data (children first)
-- -----------------------------------------------------------------------------
TRUNCATE TABLE
  public.visit_readings,
  public.visit_dosages,
  public.visit_reports,
  public.appointment_checklist_items,
  public.appointment_photos,
  public.appointment_activity,
  public.job_chat_read_receipts,
  public.job_messages
RESTART IDENTITY;

-- -----------------------------------------------------------------------------
-- 2) Appointments (CASCADE pulls any remaining FK children)
-- -----------------------------------------------------------------------------
TRUNCATE TABLE public.appointments RESTART IDENTITY CASCADE;

-- -----------------------------------------------------------------------------
-- 3) Customer-attached operational data
-- -----------------------------------------------------------------------------
TRUNCATE TABLE
  public.invoice_items,
  public.invoices,
  public.route_day_stats,
  public.route_stops,
  public.routes,
  public.pool_shopping_items,
  public.pool_work_orders,
  public.pool_profiles,
  public.customer_addresses,
  public.customers
RESTART IDENTITY CASCADE;

-- -----------------------------------------------------------------------------
-- 4) Calls, logs, messaging, invites, push tokens
-- -----------------------------------------------------------------------------
TRUNCATE TABLE public.call_messages, public.call_logs RESTART IDENTITY CASCADE;

TRUNCATE TABLE
  public.notification_log,
  public.email_logs,
  public.widget_analytics,
  public.direct_messages,
  public.team_invitations,
  public.push_subscriptions
RESTART IDENTITY;

-- Re-enable normal trigger behavior for validation block
SET LOCAL session_replication_role = DEFAULT;

-- -----------------------------------------------------------------------------
-- Post-reset validation (fail transaction if anything operational remains)
-- -----------------------------------------------------------------------------
DO $validate$
DECLARE
  n bigint;
BEGIN
  SELECT COUNT(*) INTO n FROM public.customers;
  IF n > 0 THEN
    RAISE EXCEPTION 'Reset incomplete: customers = %', n;
  END IF;

  SELECT COUNT(*) INTO n FROM public.appointments;
  IF n > 0 THEN
    RAISE EXCEPTION 'Reset incomplete: appointments = %', n;
  END IF;

  SELECT COUNT(*) INTO n FROM public.call_logs;
  IF n > 0 THEN
    RAISE EXCEPTION 'Reset incomplete: call_logs = %', n;
  END IF;

  SELECT COUNT(*) INTO n FROM public.invoices;
  IF n > 0 THEN
    RAISE EXCEPTION 'Reset incomplete: invoices = %', n;
  END IF;

  SELECT COUNT(*) INTO n FROM public.notification_log;
  IF n > 0 THEN
    RAISE EXCEPTION 'Reset incomplete: notification_log = %', n;
  END IF;

  SELECT COUNT(*) INTO n FROM public.email_logs;
  IF n > 0 THEN
    RAISE EXCEPTION 'Reset incomplete: email_logs = %', n;
  END IF;

  -- Must still have tenant + team + catalog
  SELECT COUNT(*) INTO n FROM public.businesses;
  IF n = 0 THEN
    RAISE EXCEPTION 'Reset error: businesses table is empty — aborting';
  END IF;

  SELECT COUNT(*) INTO n FROM public.users;
  IF n = 0 THEN
    RAISE EXCEPTION 'Reset error: users table is empty — aborting';
  END IF;

  SELECT COUNT(*) INTO n FROM public.services;
  IF n = 0 THEN
    RAISE WARNING 'services table is empty — verify this is intentional';
  END IF;

  RAISE NOTICE 'Operational reset validation passed.';
END;
$validate$;

SELECT 'AFTER' AS phase,
  (SELECT COUNT(*) FROM public.customers) AS customers,
  (SELECT COUNT(*) FROM public.appointments) AS appointments,
  (SELECT COUNT(*) FROM public.call_logs) AS call_logs,
  (SELECT COUNT(*) FROM public.invoices) AS invoices,
  (SELECT COUNT(*) FROM public.notification_log) AS notification_log,
  (SELECT COUNT(*) FROM public.email_logs) AS email_logs,
  (SELECT COUNT(*) FROM public.users) AS users,
  (SELECT COUNT(*) FROM public.services) AS services,
  (SELECT COUNT(*) FROM public.businesses) AS businesses;
