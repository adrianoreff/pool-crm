import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff, Smartphone, Share, Plus, Home, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

interface PushNotificationSettingsProps {
  compact?: boolean;
}

export function PushNotificationSettings({ compact = false }: PushNotificationSettingsProps) {
  const {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    isiOS,
    isPWA,
    subscribe,
    unsubscribe,
    sendTestNotification,
  } = usePushNotifications();

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      await subscribe();
    } else {
      await unsubscribe();
    }
  };

  // iOS but not installed as PWA - show install instructions
  if (isiOS && !isPWA) {
    return (
      <Card className={compact ? 'border-0 shadow-none' : ''}>
        {!compact && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              Push Notifications
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className={compact ? 'p-0' : ''}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
              <Smartphone className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="space-y-2">
                <p className="font-medium text-sm">Install the app first</p>
                <p className="text-sm text-muted-foreground">
                  To receive push notifications on iOS, you need to add this app to your Home Screen.
                </p>
              </div>
            </div>
            
            <div className="space-y-3 pl-1">
              <p className="text-sm font-medium">How to install:</p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs">1</div>
                  <div className="flex items-center gap-1.5">
                    Tap the <Share className="h-4 w-4 text-primary inline" /> Share button in Safari
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs">2</div>
                  <div className="flex items-center gap-1.5">
                    Tap <Plus className="h-4 w-4 inline" /> "Add to Home Screen"
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs">3</div>
                  <div className="flex items-center gap-1.5">
                    Open the app from your <Home className="h-4 w-4 inline" /> Home Screen
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not supported
  if (!isSupported) {
    return (
      <Card className={compact ? 'border-0 shadow-none' : ''}>
        {!compact && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BellOff className="h-4 w-4" />
              Push Notifications
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className={compact ? 'p-0' : ''}>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">
                Push notifications are not supported in this browser.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Try using Chrome, Firefox, Edge, or install as a PWA.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Permission denied
  if (permission === 'denied') {
    return (
      <Card className={compact ? 'border-0 shadow-none' : ''}>
        {!compact && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-destructive" />
              Push Notifications
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className={compact ? 'p-0' : ''}>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <p className="font-medium text-sm">Permission denied</p>
              <p className="text-sm text-muted-foreground mt-1">
                Notifications are blocked. Please enable them in your browser settings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Supported and ready - compact version for technician profile
  if (compact) {
    return (
      <div className="flex items-center justify-between">
        <Label htmlFor="push-notifications-toggle" className="flex items-center gap-2">
          {isSubscribed ? (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          Push notifications
        </Label>
        <Switch
          id="push-notifications-toggle"
          checked={isSubscribed}
          onCheckedChange={handleToggle}
          disabled={isLoading}
        />
      </div>
    );
  }

  // Supported and ready - full version for settings page
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Receive instant notifications for new jobs, messages, and updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-main-toggle">
              {isSubscribed ? 'Enabled' : 'Disabled'}
            </Label>
            <p className="text-sm text-muted-foreground">
              {isSubscribed 
                ? 'You will receive push notifications'
                : 'Enable to receive instant updates'
              }
            </p>
          </div>
          <Switch
            id="push-main-toggle"
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={isLoading}
          />
        </div>

        {isSubscribed && (
          <div className="pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={sendTestNotification}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Bell className="h-4 w-4 mr-2" />
              )}
              Send Test Notification
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
