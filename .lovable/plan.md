

# Security Fixes Plan

## Fixes to Apply

### Fix 1 (HIGH): Replace DM UPDATE policy with RPC function

The current `WITH CHECK` on `direct_messages` uses self-referencing comparisons (`body = body`) that always evaluate to true, providing no protection.

**Steps:**
1. Create a migration that:
   - Drops the "Recipients can mark direct messages as read" UPDATE policy
   - Creates a `SECURITY DEFINER` function `mark_dm_read(p_message_ids uuid[])` that:
     - Sets `read_at = now()` only on messages where caller is the recipient (or office channel recipient)
     - Scoped to the user's business
   - Adds `SET search_path TO 'public'` to the function
2. Update `src/hooks/useDirectMessages.ts` - replace all three `markAsRead` mutations (in `useOfficeChannelMessages`, `useDirectThread`, `useMyDirectThread`) to call `supabase.rpc('mark_dm_read', { p_message_ids: toUpdate })` instead of `.from('direct_messages').update({ read_at })`

**Dependencies verified:**
- `markAsRead` is called from: `Messages.tsx`, `TechnicianChatFAB.tsx`, `AppointmentDetailModal.tsx` (but those use `useJobMessages` which uses `job_chat_read_receipts`, not `direct_messages`)
- Only `useDirectMessages.ts` calls `.update()` on `direct_messages`

### Fix 2 (MEDIUM): Fix mutable search_path on DB function

Only `update_email_templates_updated_at` lacks `search_path` (the others already have it set).

**Steps:**
1. In the same migration, recreate `update_email_templates_updated_at` with `SET search_path TO 'public'`

### Fix 3 (LOW): Replace select('*') with explicit columns

**Steps:**
1. `src/contexts/AuthContext.tsx` line 55: Replace `select('*')` with explicit columns matching `UserProfile` interface: `id, business_id, email, first_name, last_name, phone, avatar_url, role, is_active`
2. `src/hooks/useTeam.ts` lines 18 and 48: Replace `select('*')` with all `users` columns used by the `User` type: `id, business_id, email, first_name, last_name, phone, avatar_url, role, color, is_active, preferences, created_at, updated_at, last_seen_at`

### Fix 4: Ignore confirmed intentional items

Register the 4 confirmed-intentional items in the security tracker as ignored.

---

**Not included (manual action required):**
- Enable Leaked Password Protection in Supabase Dashboard > Auth > Providers > Email (Finding #5)
- VAPI credentials in Vault (Finding #2) - deferred as it requires significant architectural changes to Settings page and edge functions

