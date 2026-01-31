import { useState, useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, X } from 'lucide-react';

const DISMISSED_KEY = 'push-banner-dismissed';

export function EnablePushBanner() {
  const { isSupported, isSubscribed, isiOS, isPWA, subscribe, isLoading } = usePushNotifications();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Check sessionStorage for dismissal
    const wasDismissed = sessionStorage.getItem(DISMISSED_KEY) === 'true';
    setDismissed(wasDismissed);
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      setDismissed(true);
    }
  };

  // Don't show if:
  // - Already subscribed
  // - Not supported
  // - iOS but not installed as PWA
  // - Already dismissed this session
  if (isSubscribed || !isSupported || (isiOS && !isPWA) || dismissed) {
    return null;
  }

  return (
    <Card className="bg-primary/5 border-primary/20 mb-4">
      <CardContent className="py-3 px-4">
        <div className="flex items-start gap-3">
          <Bell className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Enable notifications</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Get instant alerts for new job assignments
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleEnable}
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90"
            >
              Enable
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
