import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTechnicianAppointments } from '@/hooks/useTechnicianAppointments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Phone, LogOut, User, Bell, Lock, BarChart3 } from 'lucide-react';
import { useMemo } from 'react';
import { PushNotificationSettings } from '@/components/settings/PushNotificationSettings';
import { PushNotificationPreferences } from '@/components/settings/PushNotificationPreferences';

function getInitials(firstName: string | null, lastName: string | null) {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';
}

export default function Profile() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  // Get this month's appointments for stats
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const { data: monthAppointments = [] } = useTechnicianAppointments({
    dateFrom: monthStart.toISOString().split('T')[0],
    dateTo: today.toISOString().split('T')[0],
    status: 'completed',
  });

  const stats = useMemo(() => {
    const totalJobs = monthAppointments.length;
    const totalMinutes = monthAppointments.reduce((sum, apt) => {
      return sum + (apt.time_spent_minutes || 0);
    }, 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const avgPerDay = totalJobs / today.getDate();

    return { totalJobs, totalHours, avgPerDay: avgPerDay.toFixed(1) };
  }, [monthAppointments, today]);

  const handleLogout = async () => {
    await signOut();
    navigate('/technician/login');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Profile</h1>
      </div>

      {/* Profile Info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-[#F97316] text-white text-2xl">
                {getInitials(profile?.first_name || null, profile?.last_name || null)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold text-lg">
                {profile?.first_name} {profile?.last_name}
              </div>
              <div className="text-sm text-muted-foreground">{profile?.email}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phone */}
      {profile?.phone && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="h-4 w-4" />
              Phone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{profile.phone}</p>
          </CardContent>
        </Card>
      )}

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PushNotificationSettings compact />
          <PushNotificationPreferences />
          <div className="flex items-center justify-between">
            <Label htmlFor="email-notifications" className="flex items-center gap-2">
              Email notifications
            </Label>
            <Switch id="email-notifications" defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={() => navigate('/forgot-password')}>
            Change Password
          </Button>
        </CardContent>
      </Card>

      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            My Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">This Month:</div>
              <div className="mt-1 space-y-2">
                <div className="flex justify-between">
                  <span>Jobs completed:</span>
                  <span className="font-semibold">{stats.totalJobs}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hours worked:</span>
                  <span className="font-semibold">{stats.totalHours}h</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg per day:</span>
                  <span className="font-semibold">{stats.avgPerDay} jobs</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <Button
        variant="destructive"
        className="w-full"
        onClick={handleLogout}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Log Out
      </Button>
    </div>
  );
}
