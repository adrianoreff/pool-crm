import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Building, Bell, Link, Code, Pencil } from 'lucide-react';
import { useBusiness, useBookingRules, useNotificationSettings, useWidgetConfig, useUpdateBusiness, useUpdateBookingRules, useUpdateNotificationSettings } from '@/hooks/useBusiness';

// Helper to mask sensitive values
const maskValue = (value: string) => {
  if (!value || value.length <= 8) return '••••••••';
  return value.slice(0, 4) + '••••••••' + value.slice(-4);
};

export default function Settings() {
  const { data: business, isLoading: loadingBusiness } = useBusiness();
  const { data: bookingRules } = useBookingRules();
  const { data: notificationSettings } = useNotificationSettings();
  const { data: widgetConfig } = useWidgetConfig();
  const updateBusiness = useUpdateBusiness();
  const updateBookingRules = useUpdateBookingRules();
  const updateNotificationSettings = useUpdateNotificationSettings();

  // Business profile state
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessWebsite, setBusinessWebsite] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');

  // Booking rules state
  const [timeSlotInterval, setTimeSlotInterval] = useState(30);
  const [bufferTime, setBufferTime] = useState(15);
  const [advanceBookingDays, setAdvanceBookingDays] = useState(30);
  const [minimumNoticeHours, setMinimumNoticeHours] = useState(2);
  const [allowSameDay, setAllowSameDay] = useState(true);

  // Notification settings state
  const [sendConfirmation, setSendConfirmation] = useState(true);
  const [sendReminder24h, setSendReminder24h] = useState(true);
  const [notifyAdminNewAppointment, setNotifyAdminNewAppointment] = useState(true);
  const [notifyAdminCancellation, setNotifyAdminCancellation] = useState(true);

  // Integration state
  const [vapiAssistantId, setVapiAssistantId] = useState('');
  const [mapboxToken, setMapboxToken] = useState('');
  
  // Edit mode state
  const [editingVapi, setEditingVapi] = useState(false);
  const [editingMapbox, setEditingMapbox] = useState(false);

  // Track if values are saved in DB
  const savedVapiId = business?.vapi_assistant_id || '';
  const savedMapboxToken = (business as any)?.mapbox_public_token || '';

  // Sync state with fetched data
  useEffect(() => {
    if (business) {
      setBusinessName(business.name || '');
      setBusinessPhone(business.phone || '');
      setBusinessEmail(business.email || '');
      setBusinessWebsite(business.website || '');
      setBusinessAddress(business.address || '');
      setVapiAssistantId(business.vapi_assistant_id || '');
      setMapboxToken((business as any).mapbox_public_token || '');
    }
  }, [business]);

  useEffect(() => {
    if (bookingRules) {
      setTimeSlotInterval(bookingRules.time_slot_interval ?? 30);
      setBufferTime(bookingRules.buffer_time ?? 15);
      setAdvanceBookingDays(bookingRules.advance_booking_days ?? 30);
      setMinimumNoticeHours(bookingRules.minimum_notice_hours ?? 2);
      setAllowSameDay(bookingRules.allow_same_day ?? true);
    }
  }, [bookingRules]);

  useEffect(() => {
    if (notificationSettings) {
      setSendConfirmation(notificationSettings.send_confirmation ?? true);
      setSendReminder24h(notificationSettings.send_reminder_24h ?? true);
      setNotifyAdminNewAppointment(notificationSettings.notify_admin_new_appointment ?? true);
      setNotifyAdminCancellation(notificationSettings.notify_admin_cancellation ?? true);
    }
  }, [notificationSettings]);

  // Save handlers
  const handleSaveBusinessProfile = () => {
    updateBusiness.mutate({
      name: businessName,
      phone: businessPhone,
      email: businessEmail,
      website: businessWebsite,
      address: businessAddress,
    });
  };

  const handleSaveBookingRules = () => {
    updateBookingRules.mutate({
      time_slot_interval: timeSlotInterval,
      buffer_time: bufferTime,
      advance_booking_days: advanceBookingDays,
      minimum_notice_hours: minimumNoticeHours,
      allow_same_day: allowSameDay,
    });
  };

  const handleSaveNotificationSettings = () => {
    updateNotificationSettings.mutate({
      send_confirmation: sendConfirmation,
      send_reminder_24h: sendReminder24h,
      notify_admin_new_appointment: notifyAdminNewAppointment,
      notify_admin_cancellation: notifyAdminCancellation,
    });
  };

  const handleSaveVapi = () => {
    updateBusiness.mutate({
      vapi_assistant_id: vapiAssistantId || null,
    } as any, {
      onSuccess: () => setEditingVapi(false),
    });
  };

  const handleSaveMapbox = () => {
    updateBusiness.mutate({
      mapbox_public_token: mapboxToken || null,
    } as any, {
      onSuccess: () => setEditingMapbox(false),
    });
  };

  const handleCancelVapi = () => {
    setVapiAssistantId(savedVapiId);
    setEditingVapi(false);
  };

  const handleCancelMapbox = () => {
    setMapboxToken(savedMapboxToken);
    setEditingMapbox(false);
  };

  if (loadingBusiness) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-8 w-32 mb-2" /><Skeleton className="h-4 w-48" /></div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your business preferences</p>
      </div>

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="booking">Booking</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="widget">Widget</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" />Business Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input value={businessWebsite} onChange={(e) => setBusinessWebsite(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} />
              </div>
              <Button 
                className="bg-primary hover:bg-primary-hover"
                onClick={handleSaveBusinessProfile}
                disabled={updateBusiness.isPending}
              >
                {updateBusiness.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="booking">
          <Card className="shadow-card">
            <CardHeader><CardTitle>Booking Rules</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Time Slot Interval</Label>
                  <Input type="number" value={timeSlotInterval} onChange={(e) => setTimeSlotInterval(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Buffer Between Jobs (min)</Label>
                  <Input type="number" value={bufferTime} onChange={(e) => setBufferTime(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Advance Booking Days</Label>
                  <Input type="number" value={advanceBookingDays} onChange={(e) => setAdvanceBookingDays(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Minimum Notice (hours)</Label>
                  <Input type="number" value={minimumNoticeHours} onChange={(e) => setMinimumNoticeHours(Number(e.target.value))} />
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <Label>Allow Same-Day Booking</Label>
                <Switch checked={allowSameDay} onCheckedChange={setAllowSameDay} />
              </div>
              <Button 
                className="bg-primary hover:bg-primary-hover"
                onClick={handleSaveBookingRules}
                disabled={updateBookingRules.isPending}
              >
                {updateBookingRules.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />Notification Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <Label>Send Confirmation Email</Label>
                <Switch checked={sendConfirmation} onCheckedChange={setSendConfirmation} />
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <Label>24h Reminder</Label>
                <Switch checked={sendReminder24h} onCheckedChange={setSendReminder24h} />
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <Label>Admin: New Appointment</Label>
                <Switch checked={notifyAdminNewAppointment} onCheckedChange={setNotifyAdminNewAppointment} />
              </div>
              <div className="flex items-center justify-between py-2">
                <Label>Admin: Cancellation</Label>
                <Switch checked={notifyAdminCancellation} onCheckedChange={setNotifyAdminCancellation} />
              </div>
              <Button 
                className="bg-primary hover:bg-primary-hover"
                onClick={handleSaveNotificationSettings}
                disabled={updateNotificationSettings.isPending}
              >
                {updateNotificationSettings.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="flex items-center gap-2"><Link className="h-5 w-5" />Integrations</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {/* VAPI Integration */}
              <div className="space-y-4 pb-6 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">VAPI</p>
                    <p className="text-sm text-primary">AI Phone Assistant</p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={savedVapiId 
                      ? 'text-foreground border-border bg-transparent font-normal' 
                      : 'text-muted-foreground border-border bg-transparent font-normal'
                    }
                  >
                    {savedVapiId ? 'Ready' : 'Not configured'}
                  </Badge>
                </div>
                
                {editingVapi || !savedVapiId ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="vapi-id">Assistant ID</Label>
                      <Input 
                        id="vapi-id"
                        placeholder="Enter your VAPI Assistant ID"
                        value={vapiAssistantId}
                        onChange={(e) => setVapiAssistantId(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Find your Assistant ID in the VAPI dashboard under Assistant settings.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm"
                        className="bg-primary hover:bg-primary-hover"
                        onClick={handleSaveVapi}
                        disabled={updateBusiness.isPending || !vapiAssistantId}
                      >
                        {updateBusiness.isPending ? 'Saving...' : 'Save'}
                      </Button>
                      {savedVapiId && (
                        <Button size="sm" variant="outline" onClick={handleCancelVapi}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-sm">Assistant ID</Label>
                      <p className="font-mono text-sm">{maskValue(savedVapiId)}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => setEditingVapi(true)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                )}
              </div>

              {/* Mapbox Integration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Mapbox</p>
                    <p className="text-sm text-primary">Maps & Geocoding</p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={savedMapboxToken 
                      ? 'text-foreground border-border bg-transparent font-normal' 
                      : 'text-muted-foreground border-border bg-transparent font-normal'
                    }
                  >
                    {savedMapboxToken ? 'Ready' : 'Not configured'}
                  </Badge>
                </div>
                
                {editingMapbox || !savedMapboxToken ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="mapbox-token">Public Token</Label>
                      <Input 
                        id="mapbox-token"
                        placeholder="pk.eyJ1Ijoi..."
                        value={mapboxToken}
                        onChange={(e) => setMapboxToken(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Get your public token from the Mapbox account dashboard.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm"
                        className="bg-primary hover:bg-primary-hover"
                        onClick={handleSaveMapbox}
                        disabled={updateBusiness.isPending || !mapboxToken}
                      >
                        {updateBusiness.isPending ? 'Saving...' : 'Save'}
                      </Button>
                      {savedMapboxToken && (
                        <Button size="sm" variant="outline" onClick={handleCancelMapbox}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-sm">Public Token</Label>
                      <p className="font-mono text-sm">{maskValue(savedMapboxToken)}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => setEditingMapbox(true)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="widget">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Code className="h-5 w-5" />Booking Widget</CardTitle>
              <CardDescription>Embed the booking widget on your website</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <Label>Widget Active</Label>
                <Switch defaultChecked={widgetConfig?.is_active ?? true} />
              </div>
              <div className="space-y-2">
                <Label>Embed Code</Label>
                <Textarea 
                  readOnly 
                  className="font-mono text-xs"
                  value={`<script src="https://tradeflow.app/widget.js" data-id="${widgetConfig?.embed_code || business?.id || ''}"></script>`}
                />
              </div>
              <Button variant="outline">Copy Code</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
