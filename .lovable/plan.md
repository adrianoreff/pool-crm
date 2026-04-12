

# Security Fix Plan - Prioritized by Severity

## Intentional Items to Confirm

Before fixing, please confirm these items:

1. **`appointment-photos` bucket is public** -- needed for customer portal/external sharing?
2. **`verify_jwt = false` on `create-appointment`, `widget-*` functions** -- public widget endpoints, expected?
3. **`verify_jwt = false` on `send-notification`** -- called from external services/crons?
4. **All business members see full `businesses` row** -- intentional for technicians to see VAPI config?

---

## Fixes in Priority Order

### Fix 1 (CRITICAL): Appointments portal_token policy
**What**: Drop the "Portal access to appointments" RLS policy. It uses `USING (portal_token IS NOT NULL)` which makes ALL appointments readable by anyone since `portal_token` has a non-null default.
**Why safe**: The `customer-portal` edge function uses `service_role` key, bypassing RLS entirely. Dropping this policy breaks nothing.
**Migration**: `DROP POLICY "Portal access to appointments" ON public.appointments;`

### Fix 2 (CRITICAL): Widget analytics self-referencing bug
**What**: Fix the INSERT policy on `widget_analytics` where `wc.business_id = wc.business_id` compares to itself (always true).
**Migration**: Drop and recreate policy with correct condition: `wc.business_id = widget_analytics.business_id`.

### Fix 3 (HIGH): Direct messages UPDATE allows content tampering
**What**: The UPDATE policy has `WITH CHECK (true)`, letting recipients change message body, sender_id, etc.
**Fix**: Replace with a restrictive WITH CHECK that only allows updating `read_at`. Or create an RPC function `mark_dm_read(message_id)`.

### Fix 4 (HIGH): send-push-notification has no JWT verification
**What**: Anyone can call this endpoint and trigger push notifications to any user.
**Fix**: Add `getClaims()` JWT validation inside the function. Internal calls from other edge functions will still work via service_role.

### Fix 5 (MEDIUM): User enumeration via error messages
**What**: Login/Register pages pass raw Supabase errors that reveal if an email exists.
**Fix**: Replace error display with generic messages ("Invalid email or password"). Enable leaked password protection in Supabase Dashboard.
**Files**: `src/pages/Login.tsx`, `src/pages/Register.tsx`

### Fix 6 (MEDIUM): VAPI credentials exposed to technicians
**What**: `select('*')` on businesses exposes `vapi_api_key_encrypted` to all roles.
**Fix**: Replace `select('*')` with explicit column lists in `useBusiness.ts` and `AuthContext.tsx`, excluding `vapi_api_key_encrypted`.

---

## Approach

Each fix will be applied one at a time, verifying dependencies before and after. I will not refactor or reorganize unrelated code.

