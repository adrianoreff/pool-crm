import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// VAPID public key for push notifications
const VAPID_PUBLIC_KEY = 'BAkPaTOoUxoucJHyKOUPEtiUJDohQESAsRShGpW0lpMOnD2lrZg6IAi2W16QzMqBxPQX0hiYzANyrhfKNS2aeOc';

// Helper to convert base64url to Uint8Array
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

// Detect iOS device
function detectiOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

// Detect if running as installed PWA
function detectPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
}

export type PushPermission = 'default' | 'granted' | 'denied';

export interface UsePushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: PushPermission;
  isLoading: boolean;
  isiOS: boolean;
  isPWA: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  checkSubscription: () => Promise<void>;
  sendTestNotification: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<PushPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [isiOS] = useState(detectiOS);
  const [isPWA] = useState(detectPWA);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const supported = 
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;

      // On iOS, push only works in PWA mode
      if (isiOS && !isPWA) {
        setIsSupported(false);
        return;
      }

      setIsSupported(supported);
      
      if (supported && 'Notification' in window) {
        setPermission(Notification.permission as PushPermission);
      }
    };

    checkSupport();
  }, [isiOS, isPWA]);

  // Check existing subscription on mount
  const checkSubscription = useCallback(async () => {
    if (!isSupported || !user) {
      setIsSubscribed(false);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Verify it exists in our database
        const { data, error } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint)
          .maybeSingle();

        setIsSubscribed(!error && !!data);
      } else {
        setIsSubscribed(false);
      }
    } catch (err) {
      console.error('Error checking push subscription:', err);
      setIsSubscribed(false);
    }
  }, [isSupported, user]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user) {
      toast({
        title: 'Not supported',
        description: isiOS && !isPWA 
          ? 'Please install this app first (Add to Home Screen)'
          : 'Push notifications are not supported in this browser',
        variant: 'destructive',
      });
      return false;
    }

    setIsLoading(true);
    try {
      // Request permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult as PushPermission);

      if (permissionResult !== 'granted') {
        toast({
          title: 'Permission denied',
          description: 'Please enable notifications in your browser settings',
          variant: 'destructive',
        });
        return false;
      }

      // Register service worker for push
      const registration = await navigator.serviceWorker.register('/sw-push.js');
      await navigator.serviceWorker.ready;

      // CRITICAL: Force a complete reset to fix VAPID 403 errors.
      // The push service (FCM) caches the association between endpoint and VAPID key.
      // If the VAPID key changed, the old endpoint is permanently invalid.
      // We MUST: 1) unsubscribe in browser (invalidates old endpoint)
      //          2) delete ALL db subscriptions for this user
      //          3) create a completely NEW subscription with current VAPID key
      try {
        // Step 1: Unsubscribe any existing browser subscription
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          console.log('[Push] Unsubscribing existing subscription to force new endpoint');
          await existing.unsubscribe();
        }
        
        // Step 2: Delete ALL subscriptions for this user from database
        // This ensures no stale endpoints remain
        const { error: deleteError } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id);
        
        if (deleteError) {
          console.warn('[Push] Error clearing old subscriptions:', deleteError);
        } else {
          console.log('[Push] Cleared all existing subscriptions for user');
        }
      } catch (e) {
        // Best-effort cleanup; do not block subscription
        console.warn('[Push] Cleanup before subscribe failed:', e);
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = subscription.toJSON();
      if (!json.keys?.p256dh || !json.keys?.auth) {
        throw new Error('Failed to get subscription keys');
      }

      // Detect device type
      let deviceType = 'desktop';
      if (/Android/i.test(navigator.userAgent)) {
        deviceType = 'android';
      } else if (isiOS) {
        deviceType = 'ios';
      } else if (/Mobile/i.test(navigator.userAgent)) {
        deviceType = 'mobile';
      }

      // Save to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          device_type: deviceType,
        }, {
          onConflict: 'user_id,endpoint',
        });

      if (error) throw error;

      setIsSubscribed(true);
      toast({
        title: 'Notifications enabled',
        description: 'You will now receive push notifications',
      });
      return true;
    } catch (err) {
      console.error('Error subscribing to push:', err);
      toast({
        title: 'Failed to enable notifications',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user, isiOS, isPWA, toast]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);

        // Unsubscribe from push manager
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      toast({
        title: 'Notifications disabled',
        description: 'You will no longer receive push notifications',
      });
      return true;
    } catch (err) {
      console.error('Error unsubscribing from push:', err);
      toast({
        title: 'Failed to disable notifications',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  // Send test notification
  const sendTestNotification = useCallback(async () => {
    if (!user || !isSubscribed) return;

    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: user.id,
          payload: {
            title: 'Test Notification',
            body: 'Push notifications are working! 🎉',
            url: '/',
          },
        },
      });

      if (error) throw error;

      // If the function executed but could not deliver, show the returned reason.
      const sent = (data as any)?.sent as number | undefined;
      const total = (data as any)?.total as number | undefined;
      const expired = (data as any)?.expired as number | undefined;
      const errors = (data as any)?.errors as string[] | undefined;

      // If the backend removed a subscription due to VAPID mismatch, the user MUST re-subscribe.
      // Make this clear and refresh local state so the UI doesn't stay stuck on "enabled".
      const hasVapidMismatch = !!errors?.some((e) =>
        /VAPID credentials in the authorization header do not correspond/i.test(e)
      );

      if (hasVapidMismatch) {
        toast({
          title: 'Inscrição antiga removida',
          description:
            'Seu dispositivo estava inscrito com uma chave VAPID antiga. Ative as notificações novamente para recriar a inscrição.',
          variant: 'destructive',
        });
        await checkSubscription();
        return;
      }

      if ((sent === 0 || sent == null) && (expired ?? 0) > 0) {
        toast({
          title: 'Subscription removida',
          description:
            'Uma subscription inválida foi removida. Ative as notificações novamente para se re-inscrever.',
        });
        await checkSubscription();
        return;
      }

      if (total === 0) {
        toast({
          title: 'Sem dispositivos',
          description:
            'Nenhuma subscription encontrada. Ative as notificações para cadastrar este dispositivo.',
          variant: 'destructive',
        });
        await checkSubscription();
        return;
      }

      if (sent === 0 && errors?.length) {
        throw new Error(errors[0]);
      }

      toast({
        title: 'Test sent',
        description: total != null && sent != null
          ? `Enviado para ${sent}/${total} dispositivos. Confira o push no seu aparelho.`
          : 'Check for your notification!',
      });
    } catch (err) {
      console.error('Error sending test notification:', err);
      toast({
        title: 'Failed to send test',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive',
      });
      await checkSubscription();
    }
  }, [user, isSubscribed, toast, checkSubscription]);

  return {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    isiOS,
    isPWA,
    subscribe,
    unsubscribe,
    checkSubscription,
    sendTestNotification,
  };
}
