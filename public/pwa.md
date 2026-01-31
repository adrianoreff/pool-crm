# 📱 Prompt Simplificado para Push Notifications (iOS + Android)

Cole este prompt no Lovable:

---

```
# PWA PUSH NOTIFICATIONS - iOS and Android Support

## Overview
Implement push notifications for the TradeFlow CRM that work on:
- iOS (Safari - when installed as PWA)
- Android (Chrome, Firefox, Edge)
- Desktop browsers (Chrome, Firefox, Edge)

Use the existing project colors and design system (primary color: orange #F97316).

---

## PART 1: PWA Configuration

### 1.1 Install PWA Plugin
Install `vite-plugin-pwa` and configure it in vite.config.ts with:
- App name: "TradeFlow CRM"
- Short name: "TradeFlow"
- Theme color: #F97316 (orange - our primary color)
- Background color: #FFFFFF
- Display mode: standalone (required for iOS)
- Icons: 192x192 and 512x512 PNG icons

### 1.2 Add PWA Meta Tags to index.html
Add all required meta tags for:
- Apple mobile web app capable
- Apple mobile web app status bar style
- Theme color
- Viewport with viewport-fit=cover for iOS notch support
- Apple touch icons

### 1.3 Add Safe Area CSS
Add CSS utilities for iOS safe area insets (notch, home indicator):
- safe-area-top
- safe-area-bottom
- safe-area-left
- safe-area-right

---

## PART 2: Database

### 2.1 Create push_subscriptions Table
Create table with fields:
- id (UUID, primary key)
- user_id (UUID, foreign key to auth.users)
- endpoint (TEXT, the push service URL)
- p256dh (TEXT, encryption key)
- auth (TEXT, authentication secret)
- created_at (TIMESTAMP)
- device_type (TEXT, optional - 'ios', 'android', 'desktop')
- Unique constraint on (user_id, endpoint)

### 2.2 Row Level Security
- Users can only insert their own subscriptions
- Users can only view their own subscriptions
- Users can only delete their own subscriptions

---

## PART 3: Service Worker

### 3.1 Create Push Service Worker
Create file `public/sw-push.js` that handles:
- Install and activate events
- Push event (receive and display notification)
- Notification click (open app and navigate to URL)
- Notification close

Notification display should include:
- Title and body from payload
- App icon (/icon-192.png)
- Badge icon
- Click action to open specified URL
- Tag for grouping notifications

---

## PART 4: React Hook

### 4.1 Create usePushNotifications Hook
Create hook at `src/hooks/usePushNotifications.ts` that provides:

**State:**
- isSupported (boolean - if browser supports push)
- isSubscribed (boolean - if user has active subscription)
- permission ('default' | 'granted' | 'denied')
- isLoading (boolean)
- isiOS (boolean - detect iOS device)
- isPWA (boolean - detect if running as installed PWA)

**Functions:**
- subscribe() - Request permission, register service worker, create subscription, save to database
- unsubscribe() - Remove subscription from push manager and database
- checkSubscription() - Check if user has existing subscription

**Important iOS Logic:**
- Detect iOS device via user agent
- Detect PWA mode via display-mode: standalone
- On iOS, push notifications ONLY work when app is installed as PWA
- If iOS but not PWA, set isSupported = false

**VAPID Key:**
- Use environment variable or constant for VAPID_PUBLIC_KEY
- Include helper function to convert base64url to Uint8Array

---

## PART 5: Edge Function

### 5.1 Create send-push-notification Edge Function
Create Supabase Edge Function that:
- Accepts: user_id and payload (title, body, icon, url)
- Fetches user's push subscriptions from database
- Encrypts payload using Web Push protocol (RFC 8291, aes128gcm)
- Generates VAPID JWT for authorization
- Sends POST request to push service endpoint
- Handles expired subscriptions (410/404 responses - delete from DB)
- Returns success count

**Required Secrets:**
- VAPID_PUBLIC_KEY
- VAPID_PRIVATE_KEY

**Encryption:**
- Use aes128gcm content encoding (NOT aesgcm)
- Follow RFC 8291 for key derivation
- Use HKDF for deriving CEK and nonce

### 5.2 Make Function Accessible
Configure the edge function to be callable (verify_jwt = false or use service role)

---

## PART 6: UI Components

### 6.1 Create PushNotificationSettings Component
Create component for Settings page that shows:

**If iOS but NOT installed as PWA:**
- Message: "Install the app first"
- Instructions with steps:
  1. Tap Share button in Safari
  2. Tap "Add to Home Screen"
  3. Open app from home screen
- Use orange (#F97316) for icons/highlights

**If Not Supported:**
- Message: "Push notifications not supported in this browser"
- Gray/muted styling

**If Permission Denied:**
- Message: "Permission denied - update browser settings"
- Warning styling

**If Supported:**
- Toggle switch to enable/disable notifications
- Show current status (Enabled/Disabled)
- "Send Test" button when enabled
- Use project's orange color for active states
- Use existing shadcn/ui components (Switch, Button, Card)

### 6.2 Add to Settings Page
Add the PushNotificationSettings component to the main Settings page (/settings)
Place it in a logical section (e.g., "Notifications" section)

---

## PART 7: Integration Points

### 7.1 When to Send Push Notifications
Integrate push notifications for these events:
- New appointment booked (notify admin)
- Appointment confirmed (notify customer if subscribed)
- Technician assigned to job (notify technician)
- Technician en route (notify customer)
- Job completed (notify admin)
- New message in job chat (notify recipient)
- Problem reported by technician (notify admin)

### 7.2 How to Trigger
When these events occur, call the edge function:
```
supabase.functions.invoke('send-push-notification', {
  body: {
    user_id: targetUserId,
    payload: {
      title: 'Notification Title',
      body: 'Notification message',
      url: '/relevant-page'
    }
  }
})
```

---

## PART 8: Technician Portal

### 8.1 Add Push Settings to Technician Profile
Add push notification toggle to the technician profile page (/technician/profile)
Same component as admin but styled for mobile view

### 8.2 Prompt to Enable on First Login
When technician logs in for first time (or hasn't enabled push):
- Show a prompt/banner suggesting to enable notifications
- "Enable notifications to receive job alerts"
- Dismissible but can show again in settings

---

## Design Requirements

Use existing project design system:
- Primary color: #F97316 (orange)
- Use shadcn/ui components
- Match existing card styles, spacing, typography
- Mobile-first responsive design
- Support dark mode if project has it

---

## Testing

After implementation:
1. Test subscribe flow on desktop Chrome
2. Test notification delivery on desktop
3. Test on Android Chrome (both browser and installed PWA)
4. Test on iOS Safari (MUST be installed as PWA)
5. Verify notifications appear with correct icon and content
6. Verify click opens correct page in app

---

## Summary Checklist

| Item | Description |
|------|-------------|
| PWA Config | vite-plugin-pwa with TradeFlow branding |
| Meta Tags | iOS and Android PWA support |
| Database | push_subscriptions table with RLS |
| Service Worker | sw-push.js for receiving notifications |
| React Hook | usePushNotifications with iOS detection |
| Edge Function | send-push-notification with encryption |
| Settings UI | Toggle with iOS install instructions |
| Integration | Trigger notifications on key events |
| Technician | Push settings in profile page |

Please implement this complete push notification system for iOS and Android.
```

---

## 📋 Resumo do que foi simplificado

| Original | Simplificado |
|----------|--------------|
| Código TypeScript completo | Instruções do que criar |
| Código do Service Worker | Descrição do comportamento |
| Código da Edge Function | Requisitos e fluxo |
| Apenas iOS mencionado | iOS + Android + Desktop |
| Cores hardcoded (#050505) | Usa cores do projeto (#F97316) |
| ~500 linhas de código | ~200 linhas de instruções |

## 🎨 Cores do Projeto Aplicadas

- **Primary (Orange):** #F97316
- **Background:** #FFFFFF
- **Componentes:** shadcn/ui existentes

## 📱 Plataformas Suportadas

- ✅ iOS Safari (como PWA instalado)
- ✅ Android Chrome
- ✅ Android Firefox
- ✅ Desktop Chrome/Firefox/Edge

PWA Push Notifications implementation complete! I've:

Fixed build errors - Duplicate import, type casting issue
Configured PWA - vite-plugin-pwa with TradeFlow branding, icons, manifest
Created database - push_subscriptions table with RLS policies
Built infrastructure - Service worker (sw-push.js), React hook (usePushNotifications), edge function
Added UI components - PushNotificationSettings (with iOS install instructions), EnablePushBanner for technicians
Integrated into pages - Settings notifications tab, Technician Profile, Technician Dashboard

