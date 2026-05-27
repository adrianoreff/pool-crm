# Email freeze analysis (cancellation)

## Finding: no DB-level cancellation emails

| Mechanism | Sends cancel email? |
|-----------|---------------------|
| `TRUNCATE` / `DELETE` via SQL | **No** |
| DB triggers on `appointments` | **No** (only `on_appointment_change_update_customer` updates stats) |
| `useCancelAppointment` in React | **Yes** — invokes `send-notification` |
| `customer-portal` edge function | **Yes** — on portal cancel |
| Bulk cancel in `useBulkCancelAppointments` | **Yes** — per-row edge function calls |

## Implication for production reset

Use **only** `production_operational_reset.sql` (SQL purge). Do **not** cancel appointments through the app or bulk-cancel UI before reset.

## Optional safeguards during maintenance

1. Do not run the app’s Cancel / bulk Cancel during the reset window.
2. After reset, `notification_log` and `email_logs` are empty — no retroactive sends.
3. There is no outbound email queue table in this schema; edge functions are invoked synchronously from the client.

## session_replication_role

The reset script sets `session_replication_role = replica` during truncates to skip trigger execution on any fallback paths. Primary protection remains: **no app-layer cancel calls**.
