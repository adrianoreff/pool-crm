
# PWA Push Notifications - Implementation Plan

## Overview
This plan implements a complete push notification system for TradeFlow CRM that works on iOS (Safari PWA), Android (Chrome/Firefox), and desktop browsers. The implementation uses the project's existing design system with orange (#F97316) as the primary color.

---

## Part 1: Fix Existing Build Errors

Before implementing push notifications, we need to fix two build errors:

### 1.1 Fix Duplicate Trash2 Import in Messages.tsx
- **File**: `src/pages/Messages.tsx`
- **Issue**: `Trash2` is imported twice on lines 3 and 35
- **Fix**: Remove duplicate import from line 35

### 1.2 Fix Type Error in JobProblem.tsx
- **File**: `src/pages/technician/JobProblem.tsx`
- **Issue**: `status` property type mismatch - string not assignable to appointment_status enum
- **Fix**: Cast status to the proper enum type:
```typescript
updateData.status = 'cancelled' as const;
```

---

## Part 2: Install and Configure PWA Plugin

### 2.1 Install vite-plugin-pwa
Add `vite-plugin-pwa` to dependencies:
- Package: `vite-plugin-pwa`
- Workbox integration for service worker generation

### 2.2 Configure vite.config.ts
```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    // ... existing plugins
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'TradeFlow CRM',
        short_name: 'TradeFlow',
        description: 'Field Service Management CRM',
        theme_color: '#F97316',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [...]
      }
    })
  ]
});
```

---

## Part 3: Update index.html

### 3.1 Add PWA Meta Tags
Add to `<head>`:
```html
<!-- PWA Meta Tags -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="TradeFlow" />
<meta name="theme-color" content="#F97316" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />

<!-- Apple Touch Icons -->
<link rel="apple-touch-icon" href="/icon-192.png" />
<link rel="apple-touch-icon" sizes="152x152" href="/icon-192.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/icon-192.png" />
<link rel="apple-touch-icon" sizes="167x167" href="/icon-192.png" />

<!-- Manifest -->
<link rel="manifest" href="/manifest.webmanifest" />
```

### 3.2 Update Title and Description
- Change title from "Lovable App" to "TradeFlow CRM"
- Update meta descriptions

---

## Part 4: Create PWA Icons

Create placeholder PNG icons in `/public`:
- `/public/icon-192.png` (192x192px - orange "TF" logo)
- `/public/icon-512.png` (512x512px - orange "TF" logo)

Note: These will be generated as simple SVG-based icons initially. The user can replace them with proper branding later.

---

## Part 5: Add Safe Area CSS

### 5.1 Update src/index.css
Add safe area utility classes for iOS notch/home indicator:
```css
/* Safe Area Utilities for iOS */
.safe-area-top { padding-top: env(safe-area-inset-top); }
.safe-area-bottom { padding-bottom: env(safe-area-inset-bottom); }
.safe-area-left { padding-left: env(safe-area-inset-left); }
.safe-area-right { padding-right: env(safe-area-inset-right); }
.safe-area-inset { 
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); 
}
```

---

## Part 6: Database Schema

### 6.1 Create push_subscriptions Table

**Migration SQL**:
```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_type TEXT DEFAULT 'desktop',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own subscriptions
CREATE POLICY "Users can insert own subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own subscriptions"
  ON push_subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own subscriptions"
  ON push_subscriptions FOR DELETE
  USING (user_id = auth.uid());

-- Service role can read all for sending notifications
CREATE POLICY "Service role can read all subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.role() = 'service_role');
```

---

## Part 7: Create Service Worker

### 7.1 Create public/sw-push.js
```javascript
// Push Notification Service Worker
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('push', (e) => {
  const data = e.data?.json() || {};
  const title = data.title || 'TradeFlow CRM';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'default',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200]
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then((list) => {
      for (const client of list) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
```

---

## Part 8: Create React Hook

### 8.1 Create src/hooks/usePushNotifications.ts

Key functionality:
- **State Management**: isSupported, isSubscribed, permission, isLoading, isiOS, isPWA
- **iOS Detection**: Check user agent for iOS devices
- **PWA Detection**: Check `display-mode: standalone`
- **subscribe()**: Request permission, register SW, create subscription, save to DB
- **unsubscribe()**: Remove from push manager and DB
- **checkSubscription()**: Check existing subscription status

**VAPID Key Handling**:
- Store VAPID_PUBLIC_KEY as a constant (can be moved to env later)
- Include base64url to Uint8Array conversion helper

---

## Part 9: Create Edge Function

### 9.1 Create supabase/functions/send-push-notification/index.ts

**Request Format**:
```typescript
{
  user_id: string;
  payload: {
    title: string;
    body: string;
    url?: string;
    tag?: string;
  }
}
```

**Implementation**:
1. Receive user_id and payload
2. Fetch all push subscriptions for that user from database
3. For each subscription:
   - Build encrypted payload using Web Push protocol (RFC 8291, aes128gcm)
   - Generate VAPID JWT for authorization
   - Send POST to push service endpoint
   - Handle 410/404 responses (expired) - delete subscription
4. Return success count

**Required Secrets**:
- VAPID_PUBLIC_KEY
- VAPID_PRIVATE_KEY

**VAPID Key Generation** (one-time setup):
```bash
# Generate keys using web-push library or online tool
# Public key: goes in frontend constant
# Private key: goes in Supabase secret
```

### 9.2 Update supabase/config.toml
```toml
[functions.send-push-notification]
verify_jwt = false
```

---

## Part 10: Create UI Components

### 10.1 Create src/components/settings/PushNotificationSettings.tsx

**Component States**:

1. **iOS Not Installed as PWA**:
   - Show install instructions with orange accents
   - Steps: Tap Share > Add to Home Screen > Open from home screen
   - Use Building icon for visual appeal

2. **Not Supported**:
   - Gray message: "Push notifications not supported in this browser"
   - Suggest trying Chrome or installing as PWA

3. **Permission Denied**:
   - Warning message about browser settings
   - Link to help article on enabling notifications

4. **Supported & Ready**:
   - Switch toggle to enable/disable
   - "Send Test" button when enabled
   - Status indicator (Enabled/Disabled)
   - Use project's Switch, Button, Card components

### 10.2 Update src/pages/Settings.tsx
- Add new section under "Notifications" tab
- Include PushNotificationSettings component

### 10.3 Update src/pages/technician/Profile.tsx
- Replace dummy Switch with functional PushNotificationSettings
- Compact mobile-friendly version

---

## Part 11: Integration Points

### 11.1 Events That Trigger Push Notifications

| Event | Recipient | Edge Function Call Location |
|-------|-----------|---------------------------|
| New appointment booked | Admin | `send-notification` edge function |
| Appointment confirmed | Customer (if subscribed) | `send-notification` edge function |
| Technician assigned | Technician | `send-notification` edge function |
| Technician en route | Customer | `customer-portal` edge function |
| Job completed | Admin | `send-notification` edge function |
| New job chat message | Recipient | `NotificationContext.tsx` (realtime listener) |
| Problem reported | Admin | `JobProblem.tsx` |

### 11.2 Update send-notification Edge Function
Add push notification alongside email:
```typescript
// After sending email, also send push notification
await supabase.functions.invoke('send-push-notification', {
  body: {
    user_id: recipientUserId,
    payload: {
      title: 'New Job Assigned',
      body: `Job at ${address} on ${date}`,
      url: `/technician/jobs/${appointmentId}`
    }
  }
});
```

---

## Part 12: First-Time Enable Prompt

### 12.1 Create src/components/technician/EnablePushBanner.tsx
- Show banner on technician dashboard if:
  - Push notifications are supported
  - User hasn't subscribed yet
  - Not dismissed in this session
- "Enable Notifications" CTA button
- "Maybe Later" dismiss button
- Stores dismissal in sessionStorage

---

## Technical Details

### VAPID Keys
Web Push requires VAPID (Voluntary Application Server Identification) keys:
- **Public Key**: Shared with browser, stored in frontend
- **Private Key**: Secret, stored in Supabase secrets

The edge function will use these to sign requests to push services (FCM for Chrome, Mozilla Push for Firefox, APNs for Safari).

### Web Push Encryption (RFC 8291)
The edge function must implement:
1. ECDH key agreement with p256dh
2. HKDF key derivation
3. AES-128-GCM encryption with aes128gcm content encoding

We'll use Deno's Web Crypto API for this implementation.

### iOS Limitations
- Push only works when installed as PWA (via "Add to Home Screen")
- Must be Safari on iOS 16.4+
- User must grant permission after install

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/pages/Messages.tsx` | Fix | Remove duplicate Trash2 import |
| `src/pages/technician/JobProblem.tsx` | Fix | Fix status type casting |
| `package.json` | Update | Add vite-plugin-pwa |
| `vite.config.ts` | Update | Configure PWA plugin |
| `index.html` | Update | Add PWA meta tags |
| `public/icon-192.png` | Create | PWA icon 192x192 |
| `public/icon-512.png` | Create | PWA icon 512x512 |
| `public/sw-push.js` | Create | Push service worker |
| `src/index.css` | Update | Add safe area utilities |
| `supabase/migrations/...` | Create | push_subscriptions table |
| `src/hooks/usePushNotifications.ts` | Create | Push notifications hook |
| `supabase/functions/send-push-notification/index.ts` | Create | Edge function |
| `supabase/config.toml` | Update | Add function config |
| `src/components/settings/PushNotificationSettings.tsx` | Create | Settings component |
| `src/pages/Settings.tsx` | Update | Add push settings section |
| `src/pages/technician/Profile.tsx` | Update | Add functional push toggle |
| `src/components/technician/EnablePushBanner.tsx` | Create | First-time prompt |
| `src/pages/technician/Dashboard.tsx` | Update | Show enable banner |
| `supabase/functions/send-notification/index.ts` | Update | Add push trigger calls |

---

## Required Secrets

After approval, I'll need to add these Supabase secrets:
1. **VAPID_PUBLIC_KEY** - Will be generated
2. **VAPID_PRIVATE_KEY** - Will be generated

The VAPID_PUBLIC_KEY will also be stored as a constant in the frontend code.

---

## Testing Checklist

After implementation:
1. Desktop Chrome: Subscribe, receive test notification
2. Desktop Firefox: Subscribe, receive notification
3. Android Chrome (browser): Subscribe, receive notification
4. Android Chrome (installed PWA): Subscribe, receive notification
5. iOS Safari (not installed): See install instructions
6. iOS Safari (installed as PWA): Subscribe, receive notification
7. Verify notification click opens correct page
8. Verify unsubscribe removes from database
