import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Building, Bell, Link, Shield, Code, CheckCircle } from 'lucide-react';
import { useBusiness, useBookingRules, useNotificationSettings, useWidgetConfig } from '@/hooks/useBusiness';

export default function Settings() {
  const { data: business, isLoading: loadingBusiness } = useBusiness();
  const { data: bookingRules, isLoading: loadingRules } = useBookingRules();
  const { data: notificationSettings } = useNotificationSettings();
  const { data: widgetConfig } = useWidgetConfig();

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
                <div className="space-y-2"><Label>Business Name</Label><Input defaultValue={business?.name || ''} /></div>
                <div className="space-y-2"><Label>Phone Number</Label><Input defaultValue={business?.phone || ''} /></div>
                <div className="space-y-2"><Label>Email</Label><Input defaultValue={business?.email || ''} /></div>
                <div className="space-y-2"><Label>Website</Label><Input defaultValue={business?.website || ''} /></div>
              </div>
              <div className="space-y-2"><Label>Address</Label><Input defaultValue={business?.address || ''} /></div>
              <Button className="bg-primary hover:bg-primary-hover">Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="booking">
          <Card className="shadow-card">
            <CardHeader><CardTitle>Booking Rules</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Time Slot Interval</Label><Input type="number" defaultValue={bookingRules?.time_slot_interval || 30} /></div>
                <div className="space-y-2"><Label>Buffer Between Jobs (min)</Label><Input type="number" defaultValue={bookingRules?.buffer_time || 15} /></div>
                <div className="space-y-2"><Label>Advance Booking Days</Label><Input type="number" defaultValue={bookingRules?.advance_booking_days || 30} /></div>
                <div className="space-y-2"><Label>Minimum Notice (hours)</Label><Input type="number" defaultValue={bookingRules?.minimum_notice_hours || 2} /></div>
              </div>
              <div className="flex items-center justify-between py-2">
                <Label>Allow Same-Day Booking</Label>
                <Switch defaultChecked={bookingRules?.allow_same_day ?? true} />
              </div>
              <Button className="bg-primary hover:bg-primary-hover">Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />Notification Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'send_confirmation', label: 'Send Confirmation Email' },
                { key: 'send_reminder_24h', label: '24h Reminder' },
                { key: 'notify_admin_new_appointment', label: 'Admin: New Appointment' },
                { key: 'notify_admin_cancellation', label: 'Admin: Cancellation' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-2 border-b last:border-0">
                  <Label>{item.label}</Label>
                  <Switch defaultChecked={(notificationSettings as any)?.[item.key] ?? true} />
                </div>
              ))}
              <Button className="bg-primary hover:bg-primary-hover">Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="flex items-center gap-2"><Link className="h-5 w-5" />Integrations</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: 'VAPI', status: business?.vapi_assistant_id ? 'Connected' : 'Not configured', desc: 'AI Phone Assistant' },
                { name: 'Mapbox', status: 'Ready', desc: 'Maps & Geocoding' },
                { name: 'Resend', status: 'Connected', desc: 'Email Delivery' },
              ].map((int) => (
                <div key={int.name} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div><p className="font-medium">{int.name}</p><p className="text-sm text-muted-foreground">{int.desc}</p></div>
                  <Badge variant="outline" className={int.status === 'Connected' ? 'text-success border-success/20 bg-success/10' : 'text-muted-foreground'}>
                    {int.status === 'Connected' && <CheckCircle className="h-3 w-3 mr-1" />}{int.status}
                  </Badge>
                </div>
              ))}
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
