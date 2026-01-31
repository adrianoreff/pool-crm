// Push Notification Service Worker for TradeFlow CRM
// Handles push events and notification clicks

self.addEventListener('install', (event) => {
  console.log('[SW Push] Installing...');
  // Activate immediately without waiting for other tabs
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW Push] Activating...');
  // Take control of all clients immediately
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('[SW Push] Push received at', new Date().toISOString());

  let data = {};
  try {
    data = event.data?.json() || {};
  } catch (e) {
    console.error('[SW Push] Failed to parse push data:', e);
    data = { title: 'TradeFlow CRM', body: event.data?.text() || 'New notification' };
  }

  const title = data.title || 'TradeFlow CRM';

  // Generate unique tag with timestamp to prevent notifications from replacing each other
  // This is critical for mobile devices where rapid notifications were being silently replaced
  const uniqueTag = data.tag
    ? `${data.tag}-${Date.now()}`
    : `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    // Unique tag ensures each notification is shown separately
    tag: uniqueTag,
    // renotify: true ensures notification is shown even if tag matches (fallback)
    renotify: true,
    data: { url: data.url || '/', timestamp: Date.now() },
    // Enhanced vibration pattern for mobile: attention-grabbing
    vibrate: [100, 50, 100, 50, 200],
    // requireInteraction: true keeps notification visible until user interacts
    // Critical for technicians who may not see fleeting notifications
    requireInteraction: true,
    // Show timestamp on notification
    timestamp: Date.now(),
    // Actions for quick response (if supported)
    actions: data.url && data.url !== '/' ? [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ] : [],
  };

  // Use waitUntil to ensure the notification is shown before SW sleeps
  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => console.log('[SW Push] Notification shown:', title))
      .catch((err) => console.error('[SW Push] Failed to show notification:', err))
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW Push] Notification clicked, action:', event.action || 'default');
  event.notification.close();

  // Handle dismiss action - just close the notification
  if (event.action === 'dismiss') {
    return;
  }

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing window from this origin
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Navigate to the target URL
          return client.navigate(url).then(() => client.focus());
        }
      }
      // Open a new window if none exist
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  // Log when user dismisses without clicking (useful for analytics)
  console.log('[SW Push] Notification closed without action at', new Date().toISOString());
});

// Keep service worker alive by responding to periodic sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'push-keepalive') {
    console.log('[SW Push] Periodic sync keepalive');
  }
});

// Handle push subscription change (browser renewed subscription)
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW Push] Subscription changed, re-subscribing...');
  // The app will need to re-subscribe when user opens it
  // We can't easily update the server from here without the auth token
});
