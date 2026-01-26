import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Building, Bell, Link, Shield, Code, CheckCircle } from 'lucide-react';
import { mockBusiness } from '@/data/mockData';

export default function Settings() {
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
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Business Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <Input defaultValue={mockBusiness.name} />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input defaultValue={mockBusiness.phone} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input defaultValue={mockBusiness.email} />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input defaultValue={mockBusiness.website} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input defaultValue={mockBusiness.address} />
              </div>
              <Button className="bg-primary hover:bg-primary-hover">Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="booking">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Booking Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Time Slot Interval</Label>
                  <Input type="number" defaultValue="30" />
                </div>
                <div className="space-y-2">
                  <Label>Buffer Between Jobs (min)</Label>
                  <Input type="number" defaultValue="15" />
                </div>
                <div className="space-y-2">
                  <Label>Advance Booking Days</Label>
                  <Input type="number" defaultValue="30" />
                </div>
                <div className="space-y-2">
                  <Label>Minimum Notice (hours)</Label>
                  <Input type="number" defaultValue="2" />
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <Label>Allow Same-Day Booking</Label>
                <Switch defaultChecked />
              </div>
              <Button className="bg-primary hover:bg-primary-hover">Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {['New Appointment', 'Appointment Cancelled', 'Daily Summary', 'Customer Reminders'].map((item) => (
                <div key={item} className="flex items-center justify-between py-2 border-b last:border-0">
                  <Label>{item}</Label>
                  <Switch defaultChecked />
                </div>
              ))}
              <Button className="bg-primary hover:bg-primary-hover">Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                Integrations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: 'VAPI', status: 'Connected', desc: 'AI Phone Assistant' },
                { name: 'Mapbox', status: 'Connected', desc: 'Maps & Geocoding' },
                { name: 'Resend', status: 'Connected', desc: 'Email Delivery' },
              ].map((int) => (
                <div key={int.name} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <p className="font-medium">{int.name}</p>
                    <p className="text-sm text-muted-foreground">{int.desc}</p>
                  </div>
                  <Badge variant="outline" className="text-success border-success/20 bg-success/10">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {int.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="widget">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Booking Widget
              </CardTitle>
              <CardDescription>Embed the booking widget on your website</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <Label>Widget Active</Label>
                <Switch defaultChecked />
              </div>
              <div className="space-y-2">
                <Label>Embed Code</Label>
                <Textarea 
                  readOnly 
                  className="font-mono text-xs"
                  value={`<script src="https://tradeflow.app/widget.js" data-id="${mockBusiness.id}"></script>`}
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
