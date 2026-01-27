import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTodayTechnicianAppointments } from '@/hooks/useTechnicianAppointments';
import { useUpdateJobStatus } from '@/hooks/useUpdateJobStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MapPin, Clock, Wrench, Navigation, Play, CheckCircle2, Circle } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

function getInitials(firstName: string | null, lastName: string | null) {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';
}

function formatTimeShort(time: string) {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function getStatusBadge(status: string) {
  const statusConfig = {
    scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    confirmed: { label: 'Confirmed', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    in_progress: { label: 'In Progress', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-700 border-green-200' },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-200' },
    no_show: { label: 'No Show', color: 'bg-red-100 text-red-700 border-red-200' },
  };
  return statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
}

export default function TechnicianDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: appointments = [], isLoading } = useTodayTechnicianAppointments();
  const updateStatus = useUpdateJobStatus();

  const stats = useMemo(() => {
    const total = appointments.length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    const remaining = total - completed;
    return { total, completed, remaining };
  }, [appointments]);

  const nextJob = useMemo(() => {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return appointments
      .filter(a => {
        if (a.status === 'completed' || a.status === 'cancelled') return false;
        const appointmentTime = a.scheduled_start_time;
        return appointmentTime >= currentTime;
      })
      .sort((a, b) => {
        if (a.scheduled_date !== b.scheduled_date) {
          return a.scheduled_date.localeCompare(b.scheduled_date);
        }
        return a.scheduled_start_time.localeCompare(b.scheduled_start_time);
      })[0];
  }, [appointments]);

  const today = new Date().toISOString().split('T')[0];
  
  const todaySchedule = useMemo(() => {
    return appointments
      .filter(a => a.status !== 'cancelled' && a.scheduled_date === today)
      .sort((a, b) => a.scheduled_start_time.localeCompare(b.scheduled_start_time));
  }, [appointments, today]);
  
  const upcomingSchedule = useMemo(() => {
    return appointments
      .filter(a => a.status !== 'cancelled' && a.scheduled_date > today)
      .sort((a, b) => {
        if (a.scheduled_date !== b.scheduled_date) {
          return a.scheduled_date.localeCompare(b.scheduled_date);
        }
        return a.scheduled_start_time.localeCompare(b.scheduled_start_time);
      });
  }, [appointments, today]);

  const handleNavigate = (appointment: typeof nextJob) => {
    if (!appointment) return;
    const address = `${appointment.address}, ${appointment.city || ''} ${appointment.state || ''} ${appointment.zip_code || ''}`.trim();
    const mapboxToken = (window as any).MAPBOX_TOKEN || '';
    
    if (mapboxToken) {
      // Get user's current location
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${longitude},${latitude};${appointment.longitude},${appointment.latitude}?access_token=${mapboxToken}&geometries=geojson`;
          window.open(`https://www.mapbox.com/directions/?origin=${latitude},${longitude}&destination=${appointment.latitude},${appointment.longitude}`, '_blank');
        },
        () => {
          // Fallback: just open maps with destination
          window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
        }
      );
    } else {
      // Fallback to Google Maps
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    }
  };

  const handleStart = async (appointment: typeof nextJob) => {
    if (!appointment) return;
    await updateStatus.mutateAsync({
      id: appointment.id,
      status: 'in_progress',
      sendNotification: true,
    });
    navigate(`/technician/jobs/${appointment.id}`);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getTimeUntil = (time: string) => {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const appointmentTime = new Date();
    appointmentTime.setHours(hours, minutes, 0, 0);
    
    if (appointmentTime < now) {
      const diff = now.getTime() - appointmentTime.getTime();
      const diffMinutes = Math.floor(diff / 60000);
      if (diffMinutes < 60) return `${diffMinutes} min ago`;
      return `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m ago`;
    }
    
    const diff = appointmentTime.getTime() - now.getTime();
    const diffMinutes = Math.floor(diff / 60000);
    if (diffMinutes < 60) return `in ${diffMinutes} min`;
    return `in ${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          {getGreeting()}, {profile?.first_name || 'Technician'}!
        </h1>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-muted-foreground">Done</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.remaining}</div>
            <div className="text-sm text-muted-foreground">Left</div>
          </CardContent>
        </Card>
      </div>

      {/* Next Job */}
      {nextJob && (
        <Card className="border-2 border-[#F97316]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-[#F97316]" />
              Next Job
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="font-semibold text-lg">
                {nextJob.customer?.first_name} {nextJob.customer?.last_name}
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {nextJob.address}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{nextJob.service?.name || 'Service'}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {formatTimeShort(nextJob.scheduled_start_time)} ({getTimeUntil(nextJob.scheduled_start_time)})
              </span>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleNavigate(nextJob)}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Navigate
              </Button>
              <Button
                className="flex-1 bg-[#F97316] hover:bg-[#EA580C]"
                onClick={() => handleStart(nextJob)}
                disabled={updateStatus.isPending}
              >
                <Play className="h-4 w-4 mr-2" />
                Start
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {todaySchedule.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No appointments scheduled for today</p>
          ) : (
            <div className="space-y-3">
              {todaySchedule.map((apt) => {
                const statusBadge = getStatusBadge(apt.status);
                return (
                  <div
                    key={apt.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/technician/jobs/${apt.id}`)}
                  >
                    <div className="flex-shrink-0">
                      {apt.status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : apt.status === 'in_progress' ? (
                        <Circle className="h-5 w-5 text-orange-600 fill-orange-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">
                        {formatTimeShort(apt.scheduled_start_time)} - {apt.customer?.first_name} {apt.customer?.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">{apt.service?.name}</div>
                    </div>
                    <Badge className={cn('text-xs', statusBadge.color)}>
                      {statusBadge.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Schedule */}
      {upcomingSchedule.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingSchedule.map((apt) => {
                const statusBadge = getStatusBadge(apt.status);
                const aptDate = new Date(apt.scheduled_date);
                const dateStr = aptDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                
                return (
                  <div
                    key={apt.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/technician/jobs/${apt.id}`)}
                  >
                    <div className="flex-shrink-0">
                      <Circle className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">
                        {dateStr} - {formatTimeShort(apt.scheduled_start_time)} - {apt.customer?.first_name} {apt.customer?.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">{apt.service?.name}</div>
                    </div>
                    <Badge className={cn('text-xs', statusBadge.color)}>
                      {statusBadge.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
